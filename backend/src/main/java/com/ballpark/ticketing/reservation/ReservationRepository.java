package com.ballpark.ticketing.reservation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /**
     * 취소하려는 예매를 잠그고 읽는다. 같은 예매를 동시에 두 번 취소하면 두 번째 요청은 첫 번째가 끝날 때까지 기다렸다가
     * 이미 취소된 상태를 보게 되어, 환불이 두 번 나가지 않는다. (잠금 대상이 늘지 않게 연관 엔티티는 함께 읽지 않는다)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reservation r where r.id = :id")
    Optional<Reservation> findForUpdateById(@Param("id") Long id);

    /**
     * 경기 취소 시 자동으로 취소·환불하고 알림을 보낼 예매를 잠그고 읽는다.
     * 회원의 개별 취소와 겹쳐도 한쪽이 끝난 뒤 다른 쪽이 진행되어 환불이 두 번 나가지 않는다. (잠금 순서는 id 순)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reservation r where r.game.id = :gameId and r.status = :status order by r.id")
    List<Reservation> findAllForUpdateByGameIdAndStatus(@Param("gameId") Long gameId,
            @Param("status") ReservationStatus status);
}
