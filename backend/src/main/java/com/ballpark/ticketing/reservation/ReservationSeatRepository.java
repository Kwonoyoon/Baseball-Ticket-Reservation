package com.ballpark.ticketing.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationSeatRepository extends JpaRepository<ReservationSeat, Long> {

    /** 회원이 이 경기에서 보유 중인 좌석 수. 주어진 상태(확정·결제 대기)의 예매만 센다. */
    @Query("""
            select count(s) from ReservationSeat s
            where s.reservation.game.id = :gameId
              and s.reservation.member.id = :memberId
              and s.reservation.status in :statuses
            """)
    long countSeats(@Param("gameId") Long gameId, @Param("memberId") Long memberId,
            @Param("statuses") Collection<ReservationStatus> statuses);
}
