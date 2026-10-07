package com.ballpark.ticketing.reservation.entry;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.ballpark.ticketing.game.Game;

class EntryPolicyTest {

    private final EntryPolicy policy = new EntryPolicy(new EntryTicketProperties("unused",
            Duration.ofSeconds(30), Duration.ofMinutes(90), Duration.ofMinutes(120), Duration.ofHours(4),
            List.of(LocalDate.parse("2026-10-02"))));

    @Test
    void 평일은_1시간_30분_전부터_입장한다() {
        // 2026-10-07 수요일
        assertThat(policy.entryOpensAt(game("2026-10-07T18:30"))).isEqualTo(LocalDateTime.parse("2026-10-07T17:00"));
    }

    @Test
    void 주말은_2시간_전부터_입장한다() {
        // 2026-10-10 토요일, 2026-10-11 일요일
        assertThat(policy.entryOpensAt(game("2026-10-10T17:00"))).isEqualTo(LocalDateTime.parse("2026-10-10T15:00"));
        assertThat(policy.entryOpensAt(game("2026-10-11T14:00"))).isEqualTo(LocalDateTime.parse("2026-10-11T12:00"));
    }

    @Test
    void 평일이어도_공휴일과_대체공휴일은_2시간_전부터_입장한다() {
        // 한글날(금), 개천절 대체공휴일(월), 2027 설날 대체공휴일(화)
        assertThat(policy.entryOpensAt(game("2026-10-09T18:30"))).isEqualTo(LocalDateTime.parse("2026-10-09T16:30"));
        assertThat(policy.entryOpensAt(game("2026-10-05T18:30"))).isEqualTo(LocalDateTime.parse("2026-10-05T16:30"));
        assertThat(policy.isHoliday(LocalDate.parse("2027-02-09"))).isTrue();
        // 설정으로 더한 임시공휴일
        assertThat(policy.entryOpensAt(game("2026-10-02T18:30"))).isEqualTo(LocalDateTime.parse("2026-10-02T16:30"));
        // 공휴일이 아닌 평일
        assertThat(policy.isHoliday(LocalDate.parse("2026-10-06"))).isFalse();
    }

    @Test
    void 시작_4시간_뒤에는_끝난_경기로_본다() {
        Game game = game("2026-10-07T18:30");
        assertThat(policy.isOver(game, LocalDateTime.parse("2026-10-07T22:29"))).isFalse();
        assertThat(policy.isOver(game, LocalDateTime.parse("2026-10-07T22:30"))).isTrue();

        game.recordResult(3, 2);
        assertThat(policy.isOver(game, LocalDateTime.parse("2026-10-07T19:00"))).isTrue();
    }

    private static Game game(String startAt) {
        Game game = new Game(null, null, null, LocalDateTime.parse(startAt));
        ReflectionTestUtils.setField(game, "id", 1L);
        return game;
    }
}
