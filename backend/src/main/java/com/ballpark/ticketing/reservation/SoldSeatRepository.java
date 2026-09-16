package com.ballpark.ticketing.reservation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoldSeatRepository extends JpaRepository<SoldSeat, Long> {

    /** 구역별 조회. 유니크 인덱스 (game_id, section_id, row_no, seat_no)를 그대로 사용한다. */
    List<SoldSeat> findByGameIdAndSectionId(Long gameId, Long sectionId);

    boolean existsByGameIdAndSectionIdAndRowNoAndSeatNo(Long gameId, Long sectionId, int rowNo, int seatNo);

    /** 잔여석 표시용. 좌석 목록을 읽지 않고 구역별 판매 수만 집계한다. */
    @Query("select s.sectionId as sectionId, count(s) as soldCount from SoldSeat s where s.gameId = :gameId group by s.sectionId")
    List<SectionSoldCount> countSoldBySection(@Param("gameId") Long gameId);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("delete from SoldSeat s where s.reservationId = :reservationId")
    int deleteByReservationId(@Param("reservationId") Long reservationId);

    interface SectionSoldCount {

        Long getSectionId();

        long getSoldCount();
    }
}
