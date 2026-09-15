package com.ballpark.ticketing.seat;

import java.time.Duration;
import java.util.Collection;
import java.util.Map;

/**
 * 결제 전 좌석을 일정 시간 동안 한 회원에게 묶어 두는 임시 선점 저장소.
 * 운영에서는 Redis를, 로컬 실행과 테스트에서는 메모리 구현을 사용한다.
 */
public interface SeatHoldStore {

    /**
     * 좌석을 모두 선점하거나, 하나라도 다른 회원이 선점 중이면 아무것도 선점하지 않는다.
     * 같은 회원이 이미 선점한 좌석은 만료 시간이 연장된다.
     *
     * @return 모든 좌석을 선점했으면 {@code true}
     */
    boolean holdAll(long gameId, long memberId, Collection<SeatPosition> seats, Duration ttl);

    /** 경기의 유효한 선점 전체를 좌석별 회원 ID로 돌려준다. */
    Map<SeatPosition, Long> findHolds(long gameId);

    /** 지정한 좌석들의 선점 회원 ID를 돌려준다. 선점되지 않은 좌석은 결과에 없다. */
    Map<SeatPosition, Long> findOwners(long gameId, Collection<SeatPosition> seats);

    /** 해당 회원이 선점한 좌석만 해제한다. */
    void release(long gameId, long memberId, Collection<SeatPosition> seats);
}
