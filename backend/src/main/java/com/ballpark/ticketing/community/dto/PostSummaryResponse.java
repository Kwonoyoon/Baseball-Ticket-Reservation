package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityPost;

public record PostSummaryResponse(
        Long id,
        String authorName,
        String title,
        int viewCount,
        int likeCount,
        int commentCount,
        LocalDateTime createdAt) {

    public static PostSummaryResponse from(CommunityPost post) {
        return new PostSummaryResponse(post.getId(), post.getMember().getName(), post.getTitle(),
                post.getViewCount(), post.getLikeCount(), post.getCommentCount(), post.getCreatedAt());
    }
}
