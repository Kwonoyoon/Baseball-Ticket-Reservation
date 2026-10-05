package com.ballpark.ticketing.community;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {

    @Query("""
            select c from CommunityComment c
            join fetch c.member
            where c.post.id = :postId
            order by c.id
            """)
    List<CommunityComment> findByPostId(@Param("postId") Long postId);
}
