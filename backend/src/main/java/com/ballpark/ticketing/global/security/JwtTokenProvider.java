package com.ballpark.ticketing.global.security;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * 액세스 토큰(JWT)을 발급·검증한다. 토큰에는 회원 번호와 발급 당시의 비밀번호 변경 시각만 믿고 쓰며,
 * 권한과 계정 상태는 요청마다 DB에서 다시 확인한다. (잠금·권한 변경이 즉시 반영되도록)
 * 리프레시 토큰은 JWT가 아닌 임의 문자열이다. ({@link com.ballpark.ticketing.member.RefreshTokenService})
 */
@Component
public class JwtTokenProvider {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_TYPE = "typ";
    private static final String ACCESS_TOKEN_TYPE = "access";
    /** 발급 당시 계정의 비밀번호 변경 시각(epoch 밀리초). 계정 값과 다르면 비밀번호가 바뀐 뒤이므로 무효 */
    private static final String CLAIM_PASSWORD_CHANGED_AT = "pwdAt";

    private final SecretKey key;
    private final Duration accessTokenValidity;
    private final Clock clock;

    public JwtTokenProvider(JwtProperties properties, Clock clock) {
        byte[] secret = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("ticketing.jwt.secret은 최소 32바이트 이상이어야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.accessTokenValidity = properties.accessTokenValidity();
        this.clock = clock;
    }

    public String createAccessToken(Long memberId, String username, Instant passwordChangedAt) {
        Instant now = clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(CLAIM_USERNAME, username)
                .claim(CLAIM_TYPE, ACCESS_TOKEN_TYPE)
                .claim(CLAIM_PASSWORD_CHANGED_AT, passwordChangedAt.toEpochMilli())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenValidity)))
                .signWith(key)
                .compact();
    }

    /**
     * 서명, 만료 시간, 토큰 종류를 검증한다. 유효하지 않은 토큰이면 빈 값을 돌려준다.
     */
    public Optional<AccessTokenClaims> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Long passwordChangedAt = claims.get(CLAIM_PASSWORD_CHANGED_AT, Long.class);
            if (!ACCESS_TOKEN_TYPE.equals(claims.get(CLAIM_TYPE, String.class)) || passwordChangedAt == null) {
                return Optional.empty();
            }
            return Optional.of(new AccessTokenClaims(Long.valueOf(claims.getSubject()),
                    Instant.ofEpochMilli(passwordChangedAt)));
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            return Optional.empty();
        }
    }

    public Duration getAccessTokenValidity() {
        return accessTokenValidity;
    }

    /** 검증을 통과한 액세스 토큰의 내용 */
    public record AccessTokenClaims(Long memberId, Instant passwordChangedAt) {
    }
}
