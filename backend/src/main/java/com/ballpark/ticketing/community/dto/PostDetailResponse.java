package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityPost;
import com.ballpark.ticketing.community.PostCategory;

public record PostDetailResponse(
        Long id,
        Long teamId,
        PostCategory category,
        Long authorId,
        String authorName,
        String title,
        String content,
        int viewCount,
        int likeCount,
        int commentCount,
        boolean liked,
        boolean mine,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static PostDetailResponse of(CommunityPost post, boolean liked, boolean mine) {
        return new PostDetailResponse(post.getId(), post.getTeam().getId(), post.getCategory(), post.getMember().getId(),
                post.getMember().getName(), post.getTitle(), post.getContent(), post.getViewCount(),
                post.getLikeCount(), post.getCommentCount(), liked, mine, post.getCreatedAt(), post.getUpdatedAt());
    }
}
