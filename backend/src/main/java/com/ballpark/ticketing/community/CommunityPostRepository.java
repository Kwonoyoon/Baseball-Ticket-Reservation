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

    /** 좋아요를 받은 글만, 많은 순(같으면 최신 먼저). 좋아요가 0인 글은 인기글이 아니라서 뺀다. */
    @Query("""
            select p from CommunityPost p
            join fetch p.team
            join fetch p.member
            where p.team.id = :teamId and p.likeCount > 0
            order by p.likeCount desc, p.id desc
            """)
    List<CommunityPost> findPopularByTeamId(@Param("teamId") Long teamId, Pageable pageable);

    /** 모든 구단을 통틀어 좋아요를 받은 글 중 많은 순. 메인 화면의 "지금 뜨는 커뮤니티"에 쓴다. */
    @Query("""
            select p from CommunityPost p
            join fetch p.team
            join fetch p.member
            where p.likeCount > 0
            order by p.likeCount desc, p.id desc
            """)
    List<CommunityPost> findHotPosts(Pageable pageable);

    /** 목록 쪽 번호를 그리려고 같은 조건의 전체 글 수를 센다. (findByTeamId와 조건이 같아야 한다) */
    @Query("""
            select count(p) from CommunityPost p
            where p.team.id = :teamId
              and (:category is null or p.category = :category)
              and (:pattern is null
                   or lower(p.title) like :pattern escape '!'
                   or lower(p.content) like :pattern escape '!')
            """)
    long countByTeamId(@Param("teamId") Long teamId, @Param("category") PostCategory category,
            @Param("pattern") String pattern);

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
