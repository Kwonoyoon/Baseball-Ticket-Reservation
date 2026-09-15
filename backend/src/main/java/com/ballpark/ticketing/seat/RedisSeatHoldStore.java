package com.ballpark.ticketing.seat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * Redis 기반 좌석 선점 저장소.
 *
 * <ul>
 *   <li>좌석 키 {@code seat-hold:{game:ID}:seat:구역-열-번호} = 회원 ID (PX로 만료)</li>
 *   <li>인덱스 키 {@code seat-hold:{game:ID}:seats} = 선점 중인 좌석 ID 집합 (좌석 현황 조회용)</li>
 * </ul>
 *
 * 여러 좌석을 원자적으로 처리하기 위해 Lua 스크립트를 사용한다.
 * 해시 태그 {@code {game:ID}}로 같은 경기의 키를 한 슬롯에 모아 Redis Cluster에서도 스크립트가 동작하도록 한다.
 */
@Component
@ConditionalOnProperty(prefix = "ticketing.seat-hold", name = "store", havingValue = "redis", matchIfMissing = true)
public class RedisSeatHoldStore implements SeatHoldStore {

    private static final long INDEX_TTL_MILLIS = Duration.ofDays(1).toMillis();

    /** KEYS[1]=인덱스, KEYS[2..]=좌석 키 / ARGV[1]=회원 ID, ARGV[2]=TTL(ms), ARGV[3]=인덱스 TTL(ms), ARGV[4..]=좌석 ID */
    private static final RedisScript<Long> HOLD_SCRIPT = RedisScript.of("""
            for i = 2, #KEYS do
              local owner = redis.call('GET', KEYS[i])
              if owner and owner ~= ARGV[1] then
                return 0
              end
            end
            for i = 2, #KEYS do
              redis.call('SET', KEYS[i], ARGV[1], 'PX', ARGV[2])
              redis.call('SADD', KEYS[1], ARGV[i + 2])
            end
            redis.call('PEXPIRE', KEYS[1], ARGV[3])
            return 1
            """, Long.class);

    /** KEYS[1]=인덱스, KEYS[2..]=좌석 키 / ARGV[1]=회원 ID, ARGV[2..]=좌석 ID */
    private static final RedisScript<Long> RELEASE_SCRIPT = RedisScript.of("""
            local released = 0
            for i = 2, #KEYS do
              if redis.call('GET', KEYS[i]) == ARGV[1] then
                redis.call('DEL', KEYS[i])
                redis.call('SREM', KEYS[1], ARGV[i])
                released = released + 1
              end
            end
            return released
            """, Long.class);

    /** KEYS[1]=인덱스 / ARGV[1]=좌석 키 접두사. 만료된 좌석은 인덱스에서 함께 정리한다. */
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> FIND_SCRIPT = RedisScript.of("""
            local result = {}
            for _, seatId in ipairs(redis.call('SMEMBERS', KEYS[1])) do
              local owner = redis.call('GET', ARGV[1] .. seatId)
              if owner then
                table.insert(result, seatId)
                table.insert(result, owner)
              else
                redis.call('SREM', KEYS[1], seatId)
              end
            end
            return result
            """, List.class);

    private final StringRedisTemplate redisTemplate;

    public RedisSeatHoldStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean holdAll(long gameId, long memberId, Collection<SeatPosition> seats, Duration ttl) {
        List<String> keys = new ArrayList<>();
        List<String> args = new ArrayList<>();
        keys.add(indexKey(gameId));
        args.add(String.valueOf(memberId));
        args.add(String.valueOf(ttl.toMillis()));
        args.add(String.valueOf(INDEX_TTL_MILLIS));
        for (SeatPosition seat : seats) {
            keys.add(seatKeyPrefix(gameId) + seat.key());
            args.add(seat.key());
        }
        Long result = redisTemplate.execute(HOLD_SCRIPT, keys, args.toArray());
        return Long.valueOf(1L).equals(result);
    }

    @Override
    public Map<SeatPosition, Long> findHolds(long gameId) {
        List<?> result = redisTemplate.execute(FIND_SCRIPT, List.of(indexKey(gameId)), seatKeyPrefix(gameId));
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
    public Map<SeatPosition, Long> findOwners(long gameId, Collection<SeatPosition> seats) {
        List<SeatPosition> ordered = List.copyOf(seats);
        List<String> owners = redisTemplate.opsForValue()
                .multiGet(ordered.stream().map(seat -> seatKeyPrefix(gameId) + seat.key()).toList());
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
        List<String> keys = new ArrayList<>();
        List<String> args = new ArrayList<>();
        keys.add(indexKey(gameId));
        args.add(String.valueOf(memberId));
        for (SeatPosition seat : seats) {
            keys.add(seatKeyPrefix(gameId) + seat.key());
            args.add(seat.key());
        }
        redisTemplate.execute(RELEASE_SCRIPT, keys, args.toArray());
    }

    private static String indexKey(long gameId) {
        return "seat-hold:{game:" + gameId + "}:seats";
    }

    private static String seatKeyPrefix(long gameId) {
        return "seat-hold:{game:" + gameId + "}:seat:";
    }
}
