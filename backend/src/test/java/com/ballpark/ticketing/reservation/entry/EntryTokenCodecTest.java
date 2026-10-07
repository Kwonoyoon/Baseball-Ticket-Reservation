package com.ballpark.ticketing.reservation.entry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.ballpark.ticketing.reservation.entry.EntryTokenCodec.ParseResult;

class EntryTokenCodecTest {

    private static final String SECRET = "test-entry-ticket-secret-0123456789abcdef";
    private static final Instant NOW = Instant.parse("2026-10-07T09:00:00Z");

    @Test
    void 발급한_QR_값을_검증하면_예매를_알려준다() {
        EntryTokenCodec codec = codec(SECRET, Clock.fixed(NOW, ZoneId.of("Asia/Seoul")));

        EntryTokenCodec.IssuedToken issued = codec.issue(7L, "BP2026100700");
        ParseResult parsed = codec.parse(issued.token());

        assertThat(issued.expiresInSeconds()).isEqualTo(30);
        assertThat(parsed.expired()).isFalse();
        assertThat(parsed.claims().reservationId()).isEqualTo(7L);
        assertThat(parsed.claims().reservationNumber()).isEqualTo("BP2026100700");
        // 같은 예매라도 매번 다른 값이다.
        assertThat(codec.issue(7L, "BP2026100700").token()).isNotEqualTo(issued.token());
    }

    @Test
    void 유효_시간이_지난_QR은_만료로_알려준다() {
        String token = codec(SECRET, Clock.fixed(NOW, ZoneId.of("Asia/Seoul"))).issue(7L, "BP1").token();

        ParseResult parsed = codec(SECRET, Clock.fixed(NOW.plusSeconds(31), ZoneId.of("Asia/Seoul"))).parse(token);

        assertThat(parsed.expired()).isTrue();
        assertThat(parsed.claims()).isNull();
    }

    @Test
    void 다른_키로_서명했거나_고친_QR은_거부한다() {
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Seoul"));
        EntryTokenCodec codec = codec(SECRET, clock);
        String forged = codec("another-entry-ticket-secret-0123456789abcd", clock).issue(7L, "BP1").token();
        String token = codec.issue(7L, "BP1").token();
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1].substring(0, parts[1].length() - 2) + "AA." + parts[2];

        assertThat(codec.parse(forged).claims()).isNull();
        assertThat(codec.parse(tampered).claims()).isNull();
        assertThat(codec.parse("not-a-token").claims()).isNull();
        assertThat(codec.parse(forged).expired()).isFalse();
    }

    @Test
    void 짧은_키는_쓰지_않는다() {
        assertThatThrownBy(() -> codec("short", Clock.systemUTC())).isInstanceOf(IllegalStateException.class);
    }

    private static EntryTokenCodec codec(String secret, Clock clock) {
        return new EntryTokenCodec(new EntryTicketProperties(secret, Duration.ofSeconds(30), Duration.ofMinutes(90),
                Duration.ofMinutes(120), Duration.ofHours(4), List.of()), clock);
    }
}
