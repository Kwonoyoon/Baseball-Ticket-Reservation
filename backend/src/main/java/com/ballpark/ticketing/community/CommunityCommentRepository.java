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

    /** 글에 달린 댓글 번호만. 글을 지우기 전에 신고 처리에 쓴다. (엔티티를 불러오면 글 삭제와 엇갈린다) */
    @Query("select c.id from CommunityComment c where c.post.id = :postId")
    List<Long> findIdsByPostId(@Param("postId") Long postId);
}
