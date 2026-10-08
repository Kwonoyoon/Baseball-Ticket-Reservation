package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityComment;
import com.ballpark.ticketing.community.CommunityPost;
import com.ballpark.ticketing.community.CommunityReport;
import com.ballpark.ticketing.community.ReportTargetType;

/**
 * 신고 대상이 이미 지워졌으면 target·post 쪽 값은 모두 null이다.
 * (신고 이력 자체는 남기지만, 뭘 신고했는지는 더 보여줄 수 없다)
 *
 * @param targetPreview 목록 한 줄에 보여 줄 값. 글이면 제목, 댓글이면 댓글 내용
 * @param targetContent 관리자가 펼쳐 볼 전체 내용. 글이면 본문, 댓글이면 댓글 내용
 * @param postId        원래 글로 가는 데 쓴다. 댓글이면 그 댓글이 달린 글
 * @param postTeamId    원래 글이 있는 구단 게시판
 * @param postTitle     원래 글의 제목. 댓글이 어느 글에 달렸는지 보여 준다.
 */
public record ReportResponse(
        Long id,
        ReportTargetType targetType,
        Long targetId,
        String targetPreview,
        String targetAuthorName,
        String targetContent,
        Long postId,
        Long postTeamId,
        String postTitle,
        String reporterName,
        String reason,
        LocalDateTime createdAt) {

    public static ReportResponse ofPost(CommunityReport report, CommunityPost post) {
        if (post == null) {
            return deleted(report);
        }
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(), post.getTitle(),
                post.getMember().getName(), post.getContent(), post.getId(), post.getTeam().getId(), post.getTitle(),
                report.getReporter().getName(), report.getReason(), report.getCreatedAt());
    }

    public static ReportResponse ofComment(CommunityReport report, CommunityComment comment) {
        if (comment == null) {
            return deleted(report);
        }
        CommunityPost post = comment.getPost();
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(), comment.getContent(),
                comment.getMember().getName(), comment.getContent(), post.getId(), post.getTeam().getId(),
                post.getTitle(), report.getReporter().getName(), report.getReason(), report.getCreatedAt());
    }

    private static ReportResponse deleted(CommunityReport report) {
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(), null, null, null, null,
                null, null, report.getReporter().getName(), report.getReason(), report.getCreatedAt());
    }
}
