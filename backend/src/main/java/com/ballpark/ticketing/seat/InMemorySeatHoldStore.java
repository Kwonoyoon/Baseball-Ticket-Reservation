package com.ballpark.ticketing.seat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 단일 서버용 메모리 좌석 선점 저장소. Redis 없이 로컬 실행/테스트할 때 사용한다.
 * 여러 서버 인스턴스 사이에서는 공유되지 않으므로 운영에서는 사용하지 않는다.
 */
@Component
@ConditionalOnProperty(prefix = "ticketing.seat-hold", name = "store", havingValue = "memory")
public class InMemorySeatHoldStore implements SeatHoldStore {

    private record HoldKey(long gameId, SeatPosition seat) {
    }

    private record Hold(long memberId, Instant expiresAt) {
    }

    private final Map<HoldKey, Hold> holds = new HashMap<>();
    private final Clock clock;

    public InMemorySeatHoldStore(Clock clock) {
        this.clock = clock;
    }

    @Override
    public synchronized boolean holdAll(long gameId, long memberId, Collection<SeatPosition> seats, Duration ttl) {
        Instant now = clock.instant();
        for (SeatPosition seat : seats) {
            Hold hold = activeHold(new HoldKey(gameId, seat), now);
            if (hold != null && hold.memberId() != memberId) {
                return false;
            }
        }
        Hold newHold = new Hold(memberId, now.plus(ttl));
        for (SeatPosition seat : seats) {
            holds.put(new HoldKey(gameId, seat), newHold);
        }
        return true;
    }

    @Override
    public synchronized Map<SeatPosition, Long> findHolds(long gameId) {
        Instant now = clock.instant();
        holds.values().removeIf(hold -> isExpired(hold, now));
        Map<SeatPosition, Long> result = new HashMap<>();
        holds.forEach((key, hold) -> {
            if (key.gameId() == gameId) {
                result.put(key.seat(), hold.memberId());
            }
        });
        return result;
    }

    @Override
    public synchronized Map<SeatPosition, Long> findOwners(long gameId, Collection<SeatPosition> seats) {
        Instant now = clock.instant();
        Map<SeatPosition, Long> result = new HashMap<>();
        for (SeatPosition seat : seats) {
            Hold hold = activeHold(new HoldKey(gameId, seat), now);
            if (hold != null) {
                result.put(seat, hold.memberId());
            }
        }
        return result;
    }

    @Override
    public synchronized void release(long gameId, long memberId, Collection<SeatPosition> seats) {
        for (SeatPosition seat : seats) {
            HoldKey key = new HoldKey(gameId, seat);
            Hold hold = holds.get(key);
            if (hold != null && hold.memberId() == memberId) {
                holds.remove(key);
            }
        }
    }

    private Hold activeHold(HoldKey key, Instant now) {
        Hold hold = holds.get(key);
        if (hold != null && isExpired(hold, now)) {
            holds.remove(key);
            return null;
        }
        return hold;
    }

    private static boolean isExpired(Hold hold, Instant now) {
        return !hold.expiresAt().isAfter(now);
    }
}
