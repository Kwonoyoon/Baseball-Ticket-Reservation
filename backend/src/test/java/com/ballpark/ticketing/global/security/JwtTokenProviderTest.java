package com.ballpark.ticketing.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Date;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-32b";
    private static final Instant NOW = Instant.parse("2026-09-15T00:00:00Z");
    private static final Instant PASSWORD_CHANGED_AT = Instant.parse("2026-09-01T09:30:00.123Z");

    private final JwtProperties properties = new JwtProperties(SECRET, Duration.ofHours(1));

    @Test
    void 발급한_토큰에서_회원_정보를_복원한다() {
        JwtTokenProvider provider = providerAt(NOW);

        String token = provider.createAccessToken(7L, "fan01", PASSWORD_CHANGED_AT);

        assertThat(provider.parse(token)).hasValueSatisfying(claims -> {
            assertThat(claims.memberId()).isEqualTo(7L);
            assertThat(claims.passwordChangedAt()).isEqualTo(PASSWORD_CHANGED_AT);
        });
    }

    @Test
    void 만료된_토큰은_거부한다() {
        String token = providerAt(NOW).createAccessToken(7L, "fan01", PASSWORD_CHANGED_AT);

        assertThat(providerAt(NOW.plus(Duration.ofHours(2))).parse(token)).isEmpty();
    }

    @Test
    void 다른_키로_서명한_토큰은_거부한다() {
        JwtTokenProvider other = new JwtTokenProvider(
                new JwtProperties("another-secret-key-that-is-long-enough!!", Duration.ofHours(1)), fixedClock(NOW));
        String token = other.createAccessToken(7L, "fan01", PASSWORD_CHANGED_AT);

        assertThat(providerAt(NOW).parse(token)).isEmpty();
        assertThat(providerAt(NOW).parse("not-a-jwt")).isEmpty();
    }

    @Test
    void 액세스_토큰이_아닌_JWT는_거부한다() {
        // 같은 키로 서명했더라도 토큰 종류(typ=access)가 없으면 인정하지 않는다.
        String token = Jwts.builder()
                .subject("7")
                .issuedAt(Date.from(NOW))
                .expiration(Date.from(NOW.plus(Duration.ofHours(1))))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThat(providerAt(NOW).parse(token)).isEmpty();
    }

    @Test
    void 너무_짧은_비밀키는_허용하지_않는다() {
        assertThatThrownBy(() -> new JwtTokenProvider(new JwtProperties("short", Duration.ofHours(1)), fixedClock(NOW)))
                .isInstanceOf(IllegalStateException.class);
    }

    private JwtTokenProvider providerAt(Instant instant) {
        return new JwtTokenProvider(properties, fixedClock(instant));
    }

    private static Clock fixedClock(Instant instant) {
        return Clock.fixed(instant, ZoneId.of("Asia/Seoul"));
    }
}
