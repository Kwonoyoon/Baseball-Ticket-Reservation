package com.ballpark.ticketing.transfer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface TicketTransferRepository extends JpaRepository<TicketTransfer, Long> {

    /** 구매·취소는 같은 양도글에 동시에 몰릴 수 있어, 행을 잠가 한 명씩 처리한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TicketTransfer t where t.id = :id")
    Optional<TicketTransfer> findByIdForUpdate(@Param("id") Long id);

    /** 아직 시작하지 않은 경기의 판매 중인 양도글. teamId가 있으면 그 구단이 홈·원정으로 뛰는 경기만. */
    @Query("""
            select distinct t from TicketTransfer t
            join fetch t.seller
            join fetch t.reservation r
            join fetch r.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            join fetch r.seats s
            join fetch s.section
            where t.status = com.ballpark.ticketing.transfer.TicketTransferStatus.OPEN
              and g.startAt > :now
              and (:teamId is null or g.homeTeam.id = :teamId or g.awayTeam.id = :teamId)
            order by t.id desc
            """)
    List<TicketTransfer> findOpen(@Param("now") LocalDateTime now, @Param("teamId") Long teamId);

    @Query("""
            select distinct t from TicketTransfer t
            join fetch t.seller
            join fetch t.reservation r
            join fetch r.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            join fetch r.seats s
            join fetch s.section
            where t.seller.id = :sellerId
            order by t.id desc
            """)
    List<TicketTransfer> findAllBySellerId(@Param("sellerId") Long sellerId);

    /** 가장 최근에 올라온 판매 중인 양도글. 좌석은 불러오지 않고(페이지 제한과 함께 쓸 수 없어서) 필요할 때 읽는다. */
    @Query("""
            select t from TicketTransfer t
            join fetch t.reservation r
            join fetch r.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where t.status = com.ballpark.ticketing.transfer.TicketTransferStatus.OPEN
              and g.startAt > :now
            order by t.id desc
            """)
    List<TicketTransfer> findRecentOpen(@Param("now") LocalDateTime now, org.springframework.data.domain.Pageable pageable);

    /** 예매 취소를 막을지 판단할 때 쓴다. */
    boolean existsByOpenReservationId(Long reservationId);

    @Query("""
            select t from TicketTransfer t
            where t.status = com.ballpark.ticketing.transfer.TicketTransferStatus.OPEN
              and t.reservation.game.id = :gameId
            """)
    List<TicketTransfer> findAllOpenByGameId(@Param("gameId") Long gameId);
}
