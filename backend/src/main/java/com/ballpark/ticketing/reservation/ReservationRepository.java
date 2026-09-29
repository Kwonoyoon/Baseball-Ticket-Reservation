package com.ballpark.ticketing.reservation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
            select r from Reservation r
            join fetch r.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where r.member.id = :memberId
            order by r.createdAt desc, r.id desc
            """)
    List<Reservation> findAllByMemberId(@Param("memberId") Long memberId);

    @Query("""
            select r from Reservation r
            join fetch r.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where r.id = :id
            """)
    Optional<Reservation> findDetailById(@Param("id") Long id);

    /** 아직 시작하지 않은 경기의 예매가 남아 있는지 (회원 탈퇴 전 확인) */
    boolean existsByMemberIdAndStatusAndGameStartAtAfter(Long memberId, ReservationStatus status, LocalDateTime now);

    /** 경기 취소 시 자동으로 취소·환불하고 알림을 보낼 예매자 전원을 찾는다. */
    @Query("""
            select distinct r from Reservation r
            join fetch r.member
            join fetch r.seats s
            join fetch s.section
            where r.game.id = :gameId and r.status = :status
            """)
    List<Reservation> findAllByGameIdAndStatus(@Param("gameId") Long gameId, @Param("status") ReservationStatus status);
}
