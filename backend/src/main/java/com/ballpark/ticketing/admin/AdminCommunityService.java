package com.ballpark.ticketing.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.community.CommunityCommentRepository;
import com.ballpark.ticketing.community.CommunityPostRepository;
import com.ballpark.ticketing.community.CommunityReport;
import com.ballpark.ticketing.community.CommunityReportRepository;
import com.ballpark.ticketing.community.CommunityService;
import com.ballpark.ticketing.community.ReportStatus;
import com.ballpark.ticketing.community.ReportTargetType;
import com.ballpark.ticketing.community.dto.PostDetailResponse;
import com.ballpark.ticketing.community.dto.ReportResponse;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;

/** 관리자 전용. 신고 목록 확인과 신고된 글·댓글 강제 삭제. */
@Service
@Transactional(readOnly = true)
public class AdminCommunityService {

    private final CommunityReportRepository reportRepository;
    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityService communityService;

    public AdminCommunityService(CommunityReportRepository reportRepository, CommunityPostRepository postRepository,
            CommunityCommentRepository commentRepository, CommunityService communityService) {
        this.reportRepository = reportRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.communityService = communityService;
    }

    public List<ReportResponse> listReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(report -> report.getTargetType() == ReportTargetType.POST
                        ? withPostPreview(report)
                        : withCommentPreview(report))
                .toList();
    }

    private ReportResponse withPostPreview(CommunityReport report) {
        return ReportResponse.ofPost(report, postRepository.findById(report.getTargetId()).orElse(null));
    }

    private ReportResponse withCommentPreview(CommunityReport report) {
        return ReportResponse.ofComment(report, commentRepository.findById(report.getTargetId()).orElse(null));
    }

    /**
     * 신고를 처리해 신고 대상을 지운다. 게시글이면 글을 지우고, 댓글이면 "신고 처리로 삭제된 댓글"로 바꾼다.
     */
    @Transactional
    public void deleteReportTarget(Long reportId) {
        CommunityReport report = getPendingReportOrThrow(reportId);
        // 대상을 지우면 이 신고와 같은 대상의 처리전 신고가 모두 삭제로 처리된다. (CommunityService)
        if (report.getTargetType() == ReportTargetType.POST) {
            communityService.deletePostAsAdmin(report.getTargetId());
        } else {
            communityService.deleteCommentByReport(report.getTargetId());
        }
    }

    /** 반려: 지울 만한 내용이 아니라고 판단한다. 같은 대상의 처리전 신고도 함께 반려한다. */
    @Transactional
    public void rejectReport(Long reportId) {
        CommunityReport report = getPendingReportOrThrow(reportId);
        communityService.resolveReports(report.getTargetType(), List.of(report.getTargetId()),
                ReportStatus.REJECTED);
    }

    private CommunityReport getPendingReportOrThrow(Long reportId) {
        CommunityReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REPORT_NOT_FOUND));
        if (!report.isPending()) {
            throw new BusinessException(ErrorCode.REPORT_ALREADY_PROCESSED);
        }
        return report;
    }

    /** 신고된 글을 확인한다. 조회수는 올리지 않는다. */
    public PostDetailResponse getPost(Long postId) {
        return communityService.getPostForAdmin(postId);
    }

    @Transactional
    public void deletePost(Long postId) {
        communityService.deletePostAsAdmin(postId);
    }

    @Transactional
    public void deleteComment(Long commentId) {
        communityService.deleteCommentAsAdmin(commentId);
    }
}
