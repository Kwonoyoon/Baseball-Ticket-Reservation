package com.ballpark.ticketing.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationSeatRepository extends JpaRepository<ReservationSeat, Long> {

    /** 회원이 이 경기에서 보유 중인 좌석 수. 취소한 예매는 세지 않는다. */
    @Query("""
            select count(s) from ReservationSeat s
            where s.reservation.game.id = :gameId
              and s.reservation.member.id = :memberId
              and s.reservation.status = :status
            """)
    long countSeats(@Param("gameId") Long gameId, @Param("memberId") Long memberId,
            @Param("status") ReservationStatus status);
}
