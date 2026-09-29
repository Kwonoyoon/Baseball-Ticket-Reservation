package com.ballpark.ticketing.community.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.community.CommunityReport;
import com.ballpark.ticketing.community.ReportTargetType;

/**
 * targetPreview·targetAuthorName은 신고 대상이 이미 지워졌으면 null이다.
 * (신고 이력 자체는 남기지만, 뭘 신고했는지는 더 보여줄 수 없다)
 */
public record ReportResponse(
        Long id,
        ReportTargetType targetType,
        Long targetId,
        String targetPreview,
        String targetAuthorName,
        String reporterName,
        String reason,
        LocalDateTime createdAt) {

    public static ReportResponse of(CommunityReport report, String targetPreview, String targetAuthorName) {
        return new ReportResponse(report.getId(), report.getTargetType(), report.getTargetId(), targetPreview,
                targetAuthorName, report.getReporter().getName(), report.getReason(), report.getCreatedAt());
    }
}
