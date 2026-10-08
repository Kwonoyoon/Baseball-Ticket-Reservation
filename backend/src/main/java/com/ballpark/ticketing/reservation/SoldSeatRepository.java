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

    /** 여러 경기의 판매 좌석 수를 한 번에. 메인 화면의 "매진 임박"처럼 경기 목록 전체를 훑을 때 쓴다. */
    @Query("select s.gameId as gameId, count(s) as soldCount from SoldSeat s where s.gameId in :gameIds group by s.gameId")
    List<GameSoldCount> countSoldByGames(@Param("gameIds") java.util.Collection<Long> gameIds);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("delete from SoldSeat s where s.reservationId = :reservationId")
    int deleteByReservationId(@Param("reservationId") Long reservationId);

    interface GameSoldCount {

        Long getGameId();

        long getSoldCount();
    }

    interface SectionSoldCount {

        Long getSectionId();

        long getSoldCount();
    }
}
