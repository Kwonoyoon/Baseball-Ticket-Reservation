package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityPost;
import com.ballpark.ticketing.community.PostCategory;

/** 목록 카드 한 장. preview는 본문 앞부분을 한 줄로 이어 붙여 자른 것이다. */
public record PostSummaryResponse(
        Long id,
        PostCategory category,
        String authorName,
        String title,
        String preview,
        int viewCount,
        int likeCount,
        int commentCount,
        LocalDateTime createdAt) {

    public static PostSummaryResponse from(CommunityPost post) {
        return new PostSummaryResponse(post.getId(), post.getCategory(), post.getMember().getName(), post.getTitle(),
                preview(post.getContent()), post.getViewCount(), post.getLikeCount(), post.getCommentCount(),
                post.getCreatedAt());
    }

    private static final int PREVIEW_LENGTH = 80;

    /** 줄바꿈·연속 공백을 한 칸으로 줄이고 앞부분만 남긴다. (목록에 본문 전체를 싣지 않는다) */
    static String preview(String content) {
        String oneLine = content.strip().replaceAll("\\s+", " ");
        return oneLine.length() <= PREVIEW_LENGTH ? oneLine : oneLine.substring(0, PREVIEW_LENGTH) + "…";
    }
}
