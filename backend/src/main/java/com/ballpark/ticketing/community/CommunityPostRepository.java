package com.ballpark.ticketing.community;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("""
            select p from CommunityPost p
            join fetch p.team
            join fetch p.member
            where p.team.id = :teamId
            order by p.id desc
            """)
    List<CommunityPost> findByTeamId(@Param("teamId") Long teamId, Pageable pageable);

    @Query("""
            select p from CommunityPost p
            join fetch p.team
            join fetch p.member
            where p.id = :id
            """)
    Optional<CommunityPost> findWithTeamAndMemberById(@Param("id") Long id);
}
