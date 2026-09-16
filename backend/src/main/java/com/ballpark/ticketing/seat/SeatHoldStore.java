package com.ballpark.ticketing.seat;

import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.Set;

/**
 * 결제 전 좌석을 일정 시간 동안 한 회원에게 묶어 두는 임시 선점 저장소.
 * 운영에서는 Redis를, 로컬 실행과 테스트에서는 메모리 구현을 사용한다.
 *
 * <p>구장 하나가 2만 석을 넘기 때문에 조회는 항상 <b>구역 단위</b> 또는 <b>회원 단위</b>로 한다.
 * 경기 전체 선점 목록을 한 번에 읽는 기능은 두지 않는다.
 */
public interface SeatHoldStore {

    /**
     * 좌석을 모두 선점하거나, 하나라도 다른 회원이 선점 중이면 아무것도 선점하지 않는다.
     * 같은 회원이 이미 선점한 좌석은 만료 시간이 연장된다.
     *
     * @return 모든 좌석을 선점했으면 {@code true}
     */
    boolean holdAll(long gameId, long memberId, Collection<SeatPosition> seats, Duration ttl);

    /** 한 구역의 유효한 선점을 좌석별 회원 ID로 돌려준다. */
    Map<SeatPosition, Long> findHoldsBySection(long gameId, long sectionId);

    /** 구역별 선점 좌석 수를 돌려준다. 잔여석 표시에 사용하며 좌석 목록은 읽지 않는다. */
    Map<Long, Integer> countHoldsBySection(long gameId, Collection<Long> sectionIds);

    /** 한 회원이 이 경기에서 선점 중인 좌석을 돌려준다. */
    Set<SeatPosition> findHoldsByMember(long gameId, long memberId);

    /** 지정한 좌석들의 선점 회원 ID를 돌려준다. 선점되지 않은 좌석은 결과에 없다. */
    Map<SeatPosition, Long> findOwners(long gameId, Collection<SeatPosition> seats);

    /** 해당 회원이 선점한 좌석만 해제한다. */
    void release(long gameId, long memberId, Collection<SeatPosition> seats);
}
