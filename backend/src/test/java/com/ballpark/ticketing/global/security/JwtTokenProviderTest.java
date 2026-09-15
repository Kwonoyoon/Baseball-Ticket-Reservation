package com.ballpark.ticketing.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

import com.ballpark.ticketing.member.MemberRole;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-32b";
    private static final Instant NOW = Instant.parse("2026-09-15T00:00:00Z");

    private final JwtProperties properties = new JwtProperties(SECRET, Duration.ofHours(1));

    @Test
    void 발급한_토큰에서_회원_정보를_복원한다() {
        JwtTokenProvider provider = providerAt(NOW);

        String token = provider.createAccessToken(7L, "fan@ballpark.com", MemberRole.MEMBER);

        assertThat(provider.parse(token)).hasValueSatisfying(member -> {
            assertThat(member.id()).isEqualTo(7L);
            assertThat(member.email()).isEqualTo("fan@ballpark.com");
            assertThat(member.role()).isEqualTo(MemberRole.MEMBER);
        });
    }

    @Test
    void 만료된_토큰은_거부한다() {
        String token = providerAt(NOW).createAccessToken(7L, "fan@ballpark.com", MemberRole.MEMBER);

        assertThat(providerAt(NOW.plus(Duration.ofHours(2))).parse(token)).isEmpty();
    }

    @Test
    void 다른_키로_서명한_토큰은_거부한다() {
        JwtTokenProvider other = new JwtTokenProvider(
                new JwtProperties("another-secret-key-that-is-long-enough!!", Duration.ofHours(1)), fixedClock(NOW));
        String token = other.createAccessToken(7L, "fan@ballpark.com", MemberRole.MEMBER);

        assertThat(providerAt(NOW).parse(token)).isEmpty();
        assertThat(providerAt(NOW).parse("not-a-jwt")).isEmpty();
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
