package com.ballpark.ticketing.reservation;

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
}
