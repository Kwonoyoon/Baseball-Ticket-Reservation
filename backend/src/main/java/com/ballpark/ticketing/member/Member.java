package com.ballpark.ticketing.member;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.ballpark.ticketing.global.config.ClockConfig;

@Entity
@Table(name = "members")
public class Member {

    private static final String WITHDRAWN_NAME = "탈퇴회원";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false)
    private int failedLoginAttempts;

    /** 액세스 토큰에 함께 담긴다. 값이 바뀌면(비밀번호 변경·탈퇴) 그 전에 발급된 토큰은 모두 무효다. 밀리초까지만 저장한다. */
    @Column(nullable = false)
    private LocalDateTime passwordChangedAt;

    private LocalDateTime lastLoginAt;

    private LocalDateTime withdrawnAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "favorite_team_id")
    private Long favoriteTeamId;

    protected Member() {
    }

    public Member(String username, String email, String encodedPassword, String name, LocalDateTime createdAt) {
        this(username, email, encodedPassword, name, MemberRole.MEMBER, createdAt);
    }

    public Member(String username, String email, String encodedPassword, String name, MemberRole role,
            LocalDateTime createdAt) {
        this.username = username;
        this.email = email;
        this.password = encodedPassword;
        this.name = name;
        this.role = role;
        this.status = MemberStatus.ACTIVE;
        this.passwordChangedAt = createdAt.truncatedTo(ChronoUnit.MILLIS);
        this.createdAt = createdAt;
    }

    public boolean isActive() {
        return status == MemberStatus.ACTIVE;
    }

    /**
     * 로그인 실패를 기록하고, 허용 횟수에 도달하면 계정을 잠근다.
     *
     * @return 이번 실패로 계정이 잠겼는지 여부
     */
    public boolean recordLoginFailure(int maxAttempts) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maxAttempts) {
            status = MemberStatus.LOCKED;
            return true;
        }
        return false;
    }

    public void recordLoginSuccess(LocalDateTime now) {
        failedLoginAttempts = 0;
        lastLoginAt = now;
    }

    public void lock() {
        status = MemberStatus.LOCKED;
    }

    public void unlock() {
        status = MemberStatus.ACTIVE;
        failedLoginAttempts = 0;
    }

    public void changePassword(String encodedPassword, LocalDateTime now) {
        password = encodedPassword;
        passwordChangedAt = now.truncatedTo(ChronoUnit.MILLIS);
    }

    public void updateProfile(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public void changeRole(MemberRole role) {
        this.role = role;
    }

    /** 탈퇴: 로그인할 수 없게 하고, 아이디만 남긴 채 이름과 이메일을 지운다. 예매 이력은 그대로 남는다. */
    public void withdraw(LocalDateTime now) {
        status = MemberStatus.WITHDRAWN;
        withdrawnAt = now;
        name = WITHDRAWN_NAME;
        email = "withdrawn-" + id + "@withdrawn.invalid";
        passwordChangedAt = now.truncatedTo(ChronoUnit.MILLIS);
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getName() {
        return name;
    }

    public MemberRole getRole() {
        return role;
    }

    public MemberStatus getStatus() {
        return status;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public LocalDateTime getPasswordChangedAt() {
        return passwordChangedAt;
    }

    public Instant passwordChangedAtInstant() {
        // 이전 데이터(V9 이관)는 마이크로초까지 있어 토큰 값(밀리초)과 맞추기 위해 자른다.
        return passwordChangedAt.atZone(ClockConfig.ZONE).toInstant().truncatedTo(ChronoUnit.MILLIS);
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Long getFavoriteTeamId() {
        return favoriteTeamId;
    }

    public void setFavoriteTeamId(Long favoriteTeamId) {
        this.favoriteTeamId = favoriteTeamId;
    }
}
