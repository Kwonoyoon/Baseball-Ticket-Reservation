package com.ballpark.ticketing.member;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.global.security.AuthProperties;

/**
 * 리프레시 토큰 발급·교체·폐기.
 * <p>
 * 토큰은 쓸 때마다 새 토큰으로 교체(rotation)한다. 이미 교체된 토큰이 다시 들어오면 누군가 옛 토큰을 훔쳐 쓴 것으로 보고
 * 그 로그인에서 이어진 토큰 묶음(family)을 모두 폐기한다. 단, 여러 탭이 거의 동시에 갱신하는 경우를 위해
 * 교체 직후 짧은 시간({@code refreshReuseGrace}) 안의 재사용은 해당 요청만 거절한다.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, AuthProperties properties, Clock clock) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.properties = properties;
        this.clock = clock;
    }

    /** 새 로그인: 새 토큰 묶음을 시작한다. */
    @Transactional
    public IssuedRefreshToken issue(Member member, boolean persistent) {
        return save(member, UUID.randomUUID().toString(), persistent, LocalDateTime.now(clock));
    }

    /**
     * 리프레시 토큰을 새 토큰으로 교체한다.
     *
     * @throws BusinessException INVALID_REFRESH_TOKEN - 없거나, 만료됐거나, 폐기됐거나, 계정을 쓸 수 없는 경우
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public Rotation rotate(String rawToken) {
        RefreshToken token = refreshTokenRepository.findForUpdateByTokenHash(hash(rawToken))
                .orElseThrow(RefreshTokenService::invalid);
        LocalDateTime now = LocalDateTime.now(clock);

        if (token.isRevoked()) {
            if (token.getRevokedAt().plus(properties.refreshReuseGrace()).isBefore(now)) {
                log.warn("폐기된 리프레시 토큰이 다시 사용되어 해당 로그인을 모두 끊습니다. memberId={}", token.getMember().getId());
                refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            }
            throw invalid();
        }
        Member member = token.getMember();
        if (token.isExpired(now) || !member.isActive()) {
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw invalid();
        }

        token.revoke(now);
        return new Rotation(member, save(member, token.getFamilyId(), token.isPersistent(), now));
    }

    /** 로그아웃: 이 브라우저의 로그인(토큰 묶음)만 끊는다. 없는 토큰이면 조용히 넘어간다. */
    @Transactional
    public void revokeFamily(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId(), LocalDateTime.now(clock)));
    }

    /** 이 브라우저가 자동 로그인 상태인지. (비밀번호 변경 뒤 같은 방식으로 다시 로그인시킬 때 쓴다) */
    @Transactional(readOnly = true)
    public boolean isPersistent(String rawToken) {
        return rawToken != null && refreshTokenRepository.findByTokenHash(hash(rawToken))
                .map(RefreshToken::isPersistent)
                .orElse(false);
    }

    /** 비밀번호 변경·잠금·탈퇴: 이 회원의 모든 기기 로그인을 끊는다. */
    @Transactional
    public void revokeAll(Long memberId) {
        refreshTokenRepository.revokeAllOfMember(memberId, LocalDateTime.now(clock));
    }

    /** 만료된 지 하루가 지난 토큰 기록을 매일 새벽에 지운다. */
    @Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void deleteExpired() {
        int deleted = refreshTokenRepository.deleteExpiredBefore(LocalDateTime.now(clock).minusDays(1));
        if (deleted > 0) {
            log.info("만료된 리프레시 토큰 {}건을 정리했습니다.", deleted);
        }
    }

    private IssuedRefreshToken save(Member member, String familyId, boolean persistent, LocalDateTime now) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime expiresAt = now.plus(properties.refreshTokenValidity());
        refreshTokenRepository.save(new RefreshToken(member, hash(value), familyId, persistent, expiresAt, now));
        return new IssuedRefreshToken(value, persistent);
    }

    static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static BusinessException invalid() {
        return new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
    }

    /** 쿠키로 내려보낼 토큰 원문. */
    public record IssuedRefreshToken(String value, boolean persistent) {
    }

    public record Rotation(Member member, IssuedRefreshToken refreshToken) {
    }
}
