package com.ballpark.ticketing.member;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 발급한 리프레시 토큰. 원문은 쿠키로만 내려가고 DB에는 SHA-256 해시만 남는다.
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, unique = true, length = 64, columnDefinition = "CHAR(64)")
    private String tokenHash;

    /** 한 번의 로그인에서 교체되며 이어지는 토큰 묶음 */
    @Column(nullable = false, length = 36, columnDefinition = "CHAR(36)")
    private String familyId;

    /** 자동 로그인: 브라우저를 닫아도 쿠키를 유지할지 */
    @Column(nullable = false)
    private boolean persistent;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime revokedAt;

    protected RefreshToken() {
    }

    public RefreshToken(Member member, String tokenHash, String familyId, boolean persistent, LocalDateTime expiresAt,
            LocalDateTime createdAt) {
        this.member = member;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.persistent = persistent;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }

    public void revoke(LocalDateTime now) {
        if (revokedAt == null) {
            revokedAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public Member getMember() {
        return member;
    }

    public String getFamilyId() {
        return familyId;
    }

    public boolean isPersistent() {
        return persistent;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }
}
