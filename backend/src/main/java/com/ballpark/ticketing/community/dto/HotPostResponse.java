package com.ballpark.ticketing.community.dto;

import com.ballpark.ticketing.community.CommunityPost;
import com.ballpark.ticketing.community.PostCategory;
import com.ballpark.ticketing.team.dto.TeamResponse;

/** 메인 화면 "지금 뜨는 커뮤니티"의 글 한 줄. 어느 구단 게시판의 글인지 알려 주려고 구단을 함께 담는다. */
public record HotPostResponse(
        Long id,
        TeamResponse team,
        PostCategory category,
        String title,
        int likeCount,
        int commentCount) {

    public static HotPostResponse from(CommunityPost post) {
        return new HotPostResponse(post.getId(), TeamResponse.from(post.getTeam()), post.getCategory(),
                post.getTitle(), post.getLikeCount(), post.getCommentCount());
    }
}
