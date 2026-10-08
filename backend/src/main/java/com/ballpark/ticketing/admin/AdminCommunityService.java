package com.ballpark.ticketing.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.community.CommunityCommentRepository;
import com.ballpark.ticketing.community.CommunityPostRepository;
import com.ballpark.ticketing.community.CommunityReport;
import com.ballpark.ticketing.community.CommunityReportRepository;
import com.ballpark.ticketing.community.CommunityService;
import com.ballpark.ticketing.community.ReportTargetType;
import com.ballpark.ticketing.community.dto.ReportResponse;

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

    @Transactional
    public void deletePost(Long postId) {
        communityService.deletePostAsAdmin(postId);
    }

    @Transactional
    public void deleteComment(Long commentId) {
        communityService.deleteCommentAsAdmin(commentId);
    }
}
