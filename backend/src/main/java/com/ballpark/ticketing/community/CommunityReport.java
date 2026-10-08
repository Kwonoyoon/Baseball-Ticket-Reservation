package com.ballpark.ticketing.community;

import java.time.LocalDateTime;

import com.ballpark.ticketing.member.Member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 글 또는 댓글 신고. targetId는 target_type에 따라 community_posts 또는 community_comments의 id를 가리킨다.
 * 외래키를 안 건 이유: 대상이 관리자에 의해 지워져도 신고 이력 자체는 남겨야 해서다.
 */
@Entity
@Table(name = "community_reports")
public class CommunityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id")
    private Member reporter;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    /** 삭제·반려로 처리한 시각. 처리전이면 비어 있다. */
    private LocalDateTime processedAt;

    protected CommunityReport() {
    }

    public CommunityReport(ReportTargetType targetType, Long targetId, Member reporter, String reason,
            LocalDateTime now) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.reporter = reporter;
        this.reason = reason;
        this.createdAt = now;
    }

    /** 처리전인 신고만 처리한다. 이미 처리된 신고는 그대로 둔다. */
    public void resolve(ReportStatus result, LocalDateTime now) {
        if (status == ReportStatus.PENDING && result != ReportStatus.PENDING) {
            status = result;
            processedAt = now;
        }
    }

    public boolean isPending() {
        return status == ReportStatus.PENDING;
    }

    public ReportStatus getStatus() {
        return status;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public Long getId() {
        return id;
    }

    public ReportTargetType getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public Member getReporter() {
        return reporter;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
