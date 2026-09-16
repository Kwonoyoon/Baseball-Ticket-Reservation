package com.ballpark.ticketing.seat;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * Redis 기반 좌석 선점 저장소.
 *
 * <ul>
 *   <li>좌석 키 {@code seat-hold:{game:ID}:seat:구역-열-번호} = 회원 ID (PX로 만료)</li>
 *   <li>구역 색인 {@code seat-hold:{game:ID}:section:구역} = 정렬 집합(ZSET), 점수 = 만료 시각(ms)</li>
 *   <li>회원 색인 {@code seat-hold:{game:ID}:member:회원} = 그 회원이 선점한 좌석 집합</li>
 * </ul>
 *
 * <p>구역 색인을 정렬 집합으로 두면 만료된 좌석을 점수 범위로 한 번에 정리할 수 있어,
 * 좌석 현황 조회와 잔여석 계산이 전체 좌석 수와 무관하게 빠르다.
 *
 * <p>여러 좌석을 원자적으로 처리하기 위해 Lua 스크립트를 사용한다. 해시 태그 {@code {game:ID}}로
 * 한 경기의 키를 같은 슬롯에 모아 Redis Cluster에서도 스크립트가 동작하도록 한다.
 */
@Component
@ConditionalOnProperty(prefix = "ticketing.seat-hold", name = "store", havingValue = "redis", matchIfMissing = true)
public class RedisSeatHoldStore implements SeatHoldStore {

    /** 구역 색인은 가장 늦게 만료되는 선점보다 조금 더 살려 둔다. */
    private static final long SECTION_INDEX_EXTRA_MILLIS = Duration.ofMinutes(1).toMillis();

    /** KEYS[1]=회원 색인 / ARGV[1]=키 접두사, ARGV[2]=회원 ID, ARGV[3]=TTL(ms), ARGV[4]=만료 시각(ms), ARGV[5..]=좌석 ID */
    private static final RedisScript<Long> HOLD_SCRIPT = RedisScript.of("""
            local prefix = ARGV[1]
            local memberId = ARGV[2]
            local ttl = tonumber(ARGV[3])
            local expiresAt = tonumber(ARGV[4])
            for i = 5, #ARGV do
              local owner = redis.call('GET', prefix .. 'seat:' .. ARGV[i])
              if owner and owner ~= memberId then
                return 0
              end
            end
            for i = 5, #ARGV do
              local seatId = ARGV[i]
              local sectionId = string.match(seatId, '^(%d+)-')
              redis.call('SET', prefix .. 'seat:' .. seatId, memberId, 'PX', ttl)
              redis.call('ZADD', prefix .. 'section:' .. sectionId, expiresAt, seatId)
              redis.call('PEXPIRE', prefix .. 'section:' .. sectionId, ttl + tonumber(ARGV[5 - 1]) * 0)
              redis.call('SADD', KEYS[1], seatId)
            end
            redis.call('PEXPIRE', KEYS[1], ttl)
            return 1
            """, Long.class);

    /** KEYS[1]=구역 색인 / ARGV[1]=키 접두사, ARGV[2]=현재 시각(ms) */
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> FIND_SECTION_SCRIPT = RedisScript.of("""
            redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[2])
            local result = {}
            for _, seatId in ipairs(redis.call('ZRANGEBYSCORE', KEYS[1], ARGV[2], '+inf')) do
              local owner = redis.call('GET', ARGV[1] .. 'seat:' .. seatId)
              if owner then
                table.insert(result, seatId)
                table.insert(result, owner)
              else
                redis.call('ZREM', KEYS[1], seatId)
              end
            end
            return result
            """, List.class);

    /** KEYS[1..n]=구역 색인 / ARGV[1]=현재 시각(ms). 만료분을 정리한 뒤 구역별 개수를 순서대로 돌려준다. */
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> COUNT_SECTION_SCRIPT = RedisScript.of("""
            local counts = {}
            for i = 1, #KEYS do
              redis.call('ZREMRANGEBYSCORE', KEYS[i], '-inf', ARGV[1])
              table.insert(counts, redis.call('ZCARD', KEYS[i]))
            end
            return counts
            """, List.class);

    /** KEYS[1]=회원 색인 / ARGV[1]=키 접두사, ARGV[2]=회원 ID */
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> FIND_MEMBER_SCRIPT = RedisScript.of("""
            local result = {}
            for _, seatId in ipairs(redis.call('SMEMBERS', KEYS[1])) do
              if redis.call('GET', ARGV[1] .. 'seat:' .. seatId) == ARGV[2] then
                table.insert(result, seatId)
              else
                redis.call('SREM', KEYS[1], seatId)
              end
            end
            return result
            """, List.class);

    /** KEYS[1]=회원 색인 / ARGV[1]=키 접두사, ARGV[2]=회원 ID, ARGV[3..]=좌석 ID */
    private static final RedisScript<Long> RELEASE_SCRIPT = RedisScript.of("""
            local released = 0
            for i = 3, #ARGV do
              local seatId = ARGV[i]
              local seatKey = ARGV[1] .. 'seat:' .. seatId
              if redis.call('GET', seatKey) == ARGV[2] then
                redis.call('DEL', seatKey)
                released = released + 1
              end
              redis.call('ZREM', ARGV[1] .. 'section:' .. string.match(seatId, '^(%d+)-'), seatId)
              redis.call('SREM', KEYS[1], seatId)
            end
            return released
            """, Long.class);

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;

    public RedisSeatHoldStore(StringRedisTemplate redisTemplate, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
    }

    @Override
    public boolean holdAll(long gameId, long memberId, Collection<SeatPosition> seats, Duration ttl) {
        long expiresAt = clock.millis() + ttl.toMillis();
        List<String> args = new ArrayList<>();
        args.add(prefix(gameId));
        args.add(String.valueOf(memberId));
        args.add(String.valueOf(ttl.toMillis() + SECTION_INDEX_EXTRA_MILLIS));
        args.add(String.valueOf(expiresAt));
        for (SeatPosition seat : seats) {
            args.add(seat.key());
        }
        Long result = redisTemplate.execute(HOLD_SCRIPT, List.of(memberKey(gameId, memberId)), args.toArray());
        return Long.valueOf(1L).equals(result);
    }

    @Override
    public Map<SeatPosition, Long> findHoldsBySection(long gameId, long sectionId) {
        List<?> result = redisTemplate.execute(FIND_SECTION_SCRIPT, List.of(sectionKey(gameId, sectionId)),
                prefix(gameId), String.valueOf(clock.millis()));
        Map<SeatPosition, Long> holds = new HashMap<>();
        if (result == null) {
            return holds;
        }
        for (int i = 0; i + 1 < result.size(); i += 2) {
            holds.put(SeatPosition.fromKey(result.get(i).toString()), Long.valueOf(result.get(i + 1).toString()));
        }
        return holds;
    }

    @Override
    public Map<Long, Integer> countHoldsBySection(long gameId, Collection<Long> sectionIds) {
        List<Long> ordered = List.copyOf(sectionIds);
        Map<Long, Integer> counts = new HashMap<>();
        if (ordered.isEmpty()) {
            return counts;
        }
        List<?> result = redisTemplate.execute(COUNT_SECTION_SCRIPT,
                ordered.stream().map(sectionId -> sectionKey(gameId, sectionId)).toList(),
                String.valueOf(clock.millis()));
        for (int i = 0; i < ordered.size(); i++) {
            Object count = result == null || i >= result.size() ? null : result.get(i);
            counts.put(ordered.get(i), count == null ? 0 : Integer.parseInt(count.toString()));
        }
        return counts;
    }

    @Override
    public Set<SeatPosition> findHoldsByMember(long gameId, long memberId) {
        List<?> result = redisTemplate.execute(FIND_MEMBER_SCRIPT, List.of(memberKey(gameId, memberId)),
                prefix(gameId), String.valueOf(memberId));
        Set<SeatPosition> seats = new HashSet<>();
        if (result == null) {
            return seats;
        }
        for (Object seatId : result) {
            seats.add(SeatPosition.fromKey(seatId.toString()));
        }
        return seats;
    }

    @Override
    public Map<SeatPosition, Long> findOwners(long gameId, Collection<SeatPosition> seats) {
        List<SeatPosition> ordered = List.copyOf(seats);
        List<String> owners = redisTemplate.opsForValue()
                .multiGet(ordered.stream().map(seat -> prefix(gameId) + "seat:" + seat.key()).toList());
        Map<SeatPosition, Long> result = new HashMap<>();
        if (owners == null) {
            return result;
        }
        for (int i = 0; i < ordered.size(); i++) {
            String owner = owners.get(i);
            if (owner != null) {
                result.put(ordered.get(i), Long.valueOf(owner));
            }
        }
        return result;
    }

    @Override
    public void release(long gameId, long memberId, Collection<SeatPosition> seats) {
        if (seats.isEmpty()) {
            return;
        }
        List<String> args = new ArrayList<>();
        args.add(prefix(gameId));
        args.add(String.valueOf(memberId));
        for (SeatPosition seat : seats) {
            args.add(seat.key());
        }
        redisTemplate.execute(RELEASE_SCRIPT, List.of(memberKey(gameId, memberId)), args.toArray());
    }

    private static String prefix(long gameId) {
        return "seat-hold:{game:" + gameId + "}:";
    }

    private static String sectionKey(long gameId, long sectionId) {
        return prefix(gameId) + "section:" + sectionId;
    }

    private static String memberKey(long gameId, long memberId) {
        return prefix(gameId) + "member:" + memberId;
    }
}
