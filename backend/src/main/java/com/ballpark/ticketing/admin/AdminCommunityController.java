package com.ballpark.ticketing.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.community.dto.PostDetailResponse;
import com.ballpark.ticketing.community.dto.ReportResponse;

/** 관리자 전용. 접근 제어는 SecurityConfig의 /api/admin/** 규칙이 맡는다. */
@RestController
@RequestMapping("/api/admin/community")
public class AdminCommunityController {

    private final AdminCommunityService adminCommunityService;

    public AdminCommunityController(AdminCommunityService adminCommunityService) {
        this.adminCommunityService = adminCommunityService;
    }

    @GetMapping("/reports")
    public List<ReportResponse> listReports() {
        return adminCommunityService.listReports();
    }

    /** 신고된 글을 확인한다. 공개 조회와 달리 조회수를 올리지 않는다. */
    @GetMapping("/posts/{postId}")
    public PostDetailResponse getPost(@PathVariable Long postId) {
        return adminCommunityService.getPost(postId);
    }

    /** 신고를 반려한다. 같은 대상의 처리전 신고도 함께 반려한다. */
    @PostMapping("/reports/{reportId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rejectReport(@PathVariable Long reportId) {
        adminCommunityService.rejectReport(reportId);
    }

    /** 신고를 처리해 대상을 지운다. 게시글은 지우고, 댓글은 "신고 처리로 삭제된 댓글"로 바꾼다. */
    @DeleteMapping("/reports/{reportId}/target")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReportTarget(@PathVariable Long reportId) {
        adminCommunityService.deleteReportTarget(reportId);
    }

    @DeleteMapping("/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable Long postId) {
        adminCommunityService.deletePost(postId);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId) {
        adminCommunityService.deleteComment(commentId);
    }
}
