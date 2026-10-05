package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityComment;

public record CommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String content,
        boolean mine,
        LocalDateTime createdAt) {

    public static CommentResponse of(CommunityComment comment, boolean mine) {
        return new CommentResponse(comment.getId(), comment.getMember().getId(), comment.getMember().getName(),
                comment.getContent(), mine, comment.getCreatedAt());
    }
}
