package com.ballpark.ticketing.reservation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoldSeatRepository extends JpaRepository<SoldSeat, Long> {

    List<SoldSeat> findByGameId(Long gameId);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("delete from SoldSeat s where s.reservationId = :reservationId")
    int deleteByReservationId(@Param("reservationId") Long reservationId);
}
