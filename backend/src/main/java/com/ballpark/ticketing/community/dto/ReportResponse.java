package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityComment;
import com.ballpark.ticketing.community.CommunityPost;
import com.ballpark.ticketing.community.CommunityReport;
import com.ballpark.ticketing.community.ReportStatus;
import com.ballpark.ticketing.community.ReportTargetType;

/**
 * 관리자 신고 관리 목록의 한 줄.
 *
 * @param status        신고 처리 상태 (처리전 / 삭제 / 반려)
 * @param processedAt   삭제·반려로 처리한 시각. 처리전이거나 알 수 없으면 null
 * @param targetStatus  신고 대상의 지금 상태. 지워졌으면(DELETED) target·post 쪽 값은 모두 null이다.
 *                      신고 처리로 지운 댓글(DELETED_BY_REPORT)은 관리자가 원래 내용을 확인할 수 있게 값을 그대로 준다.
 * @param targetPreview 글이면 제목, 댓글이면 댓글 내용
 * @param targetContent 펼쳐 볼 전체 내용. 글이면 본문, 댓글이면 댓글 내용
 * @param postId        원래 글로 가는 데 쓴다. 댓글이면 그 댓글이 달린 글
 * @param postTeamId    원래 글이 있는 구단 게시판
 * @param postTitle     원래 글의 제목. 댓글이 어느 글에 달렸는지 보여 준다.
 */
public record ReportResponse(
        Long id,
        ReportTargetType targetType,
        Long targetId,
        ReportStatus status,
        LocalDateTime processedAt,
        TargetStatus targetStatus,
        String targetPreview,
        String targetAuthorName,
        String targetContent,
        Long postId,
        Long postTeamId,
        String postTitle,
        String reporterName,
        String reason,
        LocalDateTime createdAt) {

    public enum TargetStatus {
        /** 그대로 있다. */
        ACTIVE,
        /** 지워져 더 보여 줄 수 없다. */
        DELETED,
        /** 신고 처리로 지웠다. (댓글만. 게시글 화면에는 안내 문구만 보인다) */
        DELETED_BY_REPORT
    }

    public static ReportResponse ofPost(CommunityReport report, CommunityPost post) {
        if (post == null) {
            return deleted(report);
        }
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(),
                report.getStatus(), report.getProcessedAt(), TargetStatus.ACTIVE,
                post.getTitle(), post.getMember().getName(), post.getContent(), post.getId(), post.getTeam().getId(),
                post.getTitle(), report.getReporter().getName(), report.getReason(), report.getCreatedAt());
    }

    public static ReportResponse ofComment(CommunityReport report, CommunityComment comment) {
        if (comment == null) {
            return deleted(report);
        }
        CommunityPost post = comment.getPost();
        TargetStatus status = comment.isDeletedByReport() ? TargetStatus.DELETED_BY_REPORT : TargetStatus.ACTIVE;
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(),
                report.getStatus(), report.getProcessedAt(), status,
                comment.getContent(), comment.getMember().getName(), comment.getContent(), post.getId(),
                post.getTeam().getId(), post.getTitle(), report.getReporter().getName(), report.getReason(),
                report.getCreatedAt());
    }

    private static ReportResponse deleted(CommunityReport report) {
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(),
                report.getStatus(), report.getProcessedAt(), TargetStatus.DELETED,
                null, null, null, null, null, null, report.getReporter().getName(), report.getReason(),
                report.getCreatedAt());
    }
}
