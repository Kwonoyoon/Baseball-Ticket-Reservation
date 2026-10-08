package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityComment;

/**
 * @param deletedByReport 신고 처리로 지운 댓글이면 true. 이때 작성자와 내용은 비우고, 화면은 안내 문구만 보여 준다.
 */
public record CommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String content,
        boolean mine,
        LocalDateTime createdAt,
        boolean deletedByReport) {

    public static CommentResponse of(CommunityComment comment, boolean mine) {
        if (comment.isDeletedByReport()) {
            return new CommentResponse(comment.getId(), null, null, null, false, comment.getCreatedAt(), true);
        }
        return new CommentResponse(comment.getId(), comment.getMember().getId(), comment.getMember().getName(),
                comment.getContent(), mine, comment.getCreatedAt(), false);
    }
}
