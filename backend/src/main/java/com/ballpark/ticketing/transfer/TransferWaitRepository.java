package com.ballpark.ticketing.transfer;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransferWaitRepository extends JpaRepository<TransferWait, Long> {

    Optional<TransferWait> findByIdAndMemberId(Long id, Long memberId);

    /** 아직 시작하지 않은 경기의 내 대기 목록 */
    @Query("""
            select w from TransferWait w
            join fetch w.game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where w.memberId = :memberId
              and g.status = com.ballpark.ticketing.game.GameStatus.SCHEDULED
              and g.startAt > :now
            order by g.startAt, w.id
            """)
    List<TransferWait> findActiveByMemberId(@Param("memberId") Long memberId, @Param("now") LocalDateTime now);

    /** 경기들의 대기자를 줄 선 순서대로. 순서가 곧 우선순위라서 정렬이 의미를 가진다. */
    @Query("""
            select w from TransferWait w
            where w.game.id in :gameIds
            order by w.createdAt, w.id
            """)
    List<TransferWait> findAllByGameIds(@Param("gameIds") Collection<Long> gameIds);

    /** 그 경기의 표를 구했으면 대기에서 빠진다. */
    @Modifying
    @Query("delete from TransferWait w where w.memberId = :memberId and w.game.id = :gameId")
    int deleteByMemberIdAndGameId(@Param("memberId") Long memberId, @Param("gameId") Long gameId);
}
