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
              and (:category is null or p.category = :category)
              and (:pattern is null
                   or lower(p.title) like :pattern escape '!'
                   or lower(p.content) like :pattern escape '!')
            order by p.id desc
            """)
    List<CommunityPost> findByTeamId(@Param("teamId") Long teamId, @Param("category") PostCategory category,
            @Param("pattern") String pattern, Pageable pageable);

    @Query("""
            select p from CommunityPost p
            join fetch p.team
            join fetch p.member
            where p.id = :id
            """)
    Optional<CommunityPost> findWithTeamAndMemberById(@Param("id") Long id);

    /** 커뮤니티 입구 화면에서 구단별 글 수를 보여 주려고 쓴다. 글이 없는 구단은 결과에 아예 안 나온다. */
    @Query("select p.team.id as teamId, count(p) as postCount from CommunityPost p group by p.team.id")
    List<TeamPostCount> countAllByTeam();

    interface TeamPostCount {

        Long getTeamId();

        long getPostCount();
    }
}
