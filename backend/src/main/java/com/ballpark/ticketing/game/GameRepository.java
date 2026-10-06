package com.ballpark.ticketing.game;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("""
            select g from Game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where g.startAt >= :from and g.startAt < :to
            order by g.startAt, g.id
            """)
    List<Game> findSchedule(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            select g from Game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            join fetch g.stadium
            where g.id = :id
            """)
    Optional<Game> findWithTeamsById(@Param("id") Long id);

    /** 결과가 나온 경기 전체. 순위표 계산에 쓴다. */
    @Query("""
            select g from Game g
            join fetch g.homeTeam
            join fetch g.awayTeam
            where g.status = com.ballpark.ticketing.game.GameStatus.FINISHED
            """)
    List<Game> findAllFinished();

    boolean existsByStartAtGreaterThanEqualAndStartAtLessThan(LocalDateTime from, LocalDateTime to);
}
