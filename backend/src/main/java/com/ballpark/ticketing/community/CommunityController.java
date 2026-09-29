package com.ballpark.ticketing.community;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.community.dto.CommentCreateRequest;
import com.ballpark.ticketing.community.dto.CommentResponse;
import com.ballpark.ticketing.community.dto.LikeResponse;
import com.ballpark.ticketing.community.dto.PostCreateRequest;
import com.ballpark.ticketing.community.dto.PostDetailResponse;
import com.ballpark.ticketing.community.dto.PostPageResponse;
import com.ballpark.ticketing.community.dto.ReportRequest;
import com.ballpark.ticketing.community.dto.TeamPostCountResponse;
import com.ballpark.ticketing.global.security.AuthMember;

import jakarta.validation.Valid;

/**
 * 글·댓글 조회는 비회원도 할 수 있다(SecurityConfig에서 permitAll). 나머지는 로그인이 필요하다.
 * 조회 쪽 {@code authMember}는 null일 수 있다 — 좋아요/작성자 여부(liked·mine)를 알려줄 회원이 있을 때만 채워 준다.
 */
@RestController
public class CommunityController {

    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    /** 커뮤니티 입구 화면(구단 고르기)에서 카드마다 게시글 수를 보여 주려고 쓴다. */
    @GetMapping("/api/community/team-post-counts")
    public List<TeamPostCountResponse> getTeamPostCounts() {
        return communityService.getTeamPostCounts();
    }

    @GetMapping("/api/teams/{teamId}/posts")
    public PostPageResponse listPosts(@PathVariable Long teamId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return communityService.listPosts(teamId, page, size);
    }

    @PostMapping("/api/teams/{teamId}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDetailResponse createPost(@PathVariable Long teamId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody PostCreateRequest request) {
        return communityService.createPost(teamId, authMember.id(), request);
    }

    @GetMapping("/api/posts/{postId}")
    public PostDetailResponse getPost(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember) {
        return communityService.getPost(postId, memberId(authMember));
    }

    @PutMapping("/api/posts/{postId}")
    public PostDetailResponse updatePost(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody PostCreateRequest request) {
        return communityService.updatePost(postId, authMember.id(), request);
    }

    @DeleteMapping("/api/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember) {
        communityService.deletePost(postId, authMember.id());
    }

    @PostMapping("/api/posts/{postId}/like")
    public LikeResponse toggleLike(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember) {
        return communityService.toggleLike(postId, authMember.id());
    }

    @PostMapping("/api/posts/{postId}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportPost(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody ReportRequest request) {
        communityService.reportPost(postId, authMember.id(), request);
    }

    @GetMapping("/api/posts/{postId}/comments")
    public List<CommentResponse> listComments(@PathVariable Long postId,
            @AuthenticationPrincipal AuthMember authMember) {
        return communityService.listComments(postId, memberId(authMember));
    }

    @PostMapping("/api/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(@PathVariable Long postId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody CommentCreateRequest request) {
        return communityService.createComment(postId, authMember.id(), request);
    }

    @DeleteMapping("/api/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId, @AuthenticationPrincipal AuthMember authMember) {
        communityService.deleteComment(commentId, authMember.id());
    }

    @PostMapping("/api/comments/{commentId}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportComment(@PathVariable Long commentId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody ReportRequest request) {
        communityService.reportComment(commentId, authMember.id(), request);
    }

    private static Long memberId(AuthMember authMember) {
        return authMember == null ? null : authMember.id();
    }
}
