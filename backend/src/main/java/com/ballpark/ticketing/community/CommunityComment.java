package com.ballpark.ticketing.community;

import java.time.LocalDateTime;

import com.ballpark.ticketing.member.Member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "community_comments")
public class CommunityComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** 관리자가 신고를 처리해 지운 시각. 행은 남기고 게시글 화면에는 내용 대신 안내만 보여 준다. */
    @Column(name = "deleted_by_report_at")
    private LocalDateTime deletedByReportAt;

    protected CommunityComment() {
    }

    public CommunityComment(CommunityPost post, Member member, String content, LocalDateTime now) {
        this.post = post;
        this.member = member;
        this.content = content;
        this.createdAt = now;
    }

    /** 신고 처리로 지운다. 원래 내용은 관리자 확인용으로 남긴다. */
    public void deleteByReport(LocalDateTime now) {
        if (deletedByReportAt == null) {
            deletedByReportAt = now;
        }
    }

    public boolean isDeletedByReport() {
        return deletedByReportAt != null;
    }

    public boolean isAuthor(Long memberId) {
        return member.getId().equals(memberId);
    }

    public Long getId() {
        return id;
    }

    public CommunityPost getPost() {
        return post;
    }

    public Member getMember() {
        return member;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
