package com.ballpark.ticketing.seat;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

class InMemorySeatHoldStoreTest {

    private static final long GAME_ID = 1L;
    private static final long ALICE = 10L;
    private static final long BOB = 20L;
    private static final Duration TTL = Duration.ofMinutes(5);

    private final MutableClock clock = new MutableClock(Instant.parse("2026-09-15T09:00:00Z"));
    private final InMemorySeatHoldStore store = new InMemorySeatHoldStore(clock);

    private final SeatPosition seatA = new SeatPosition(1L, 1, 1);
    private final SeatPosition seatB = new SeatPosition(1L, 1, 2);

    @Test
    void 다른_회원이_선점한_좌석이_하나라도_있으면_아무것도_선점하지_않는다() {
        assertThat(store.holdAll(GAME_ID, ALICE, List.of(seatA), TTL)).isTrue();

        assertThat(store.holdAll(GAME_ID, BOB, List.of(seatB, seatA), TTL)).isFalse();

        assertThat(store.findHolds(GAME_ID)).containsOnlyKeys(seatA).containsEntry(seatA, ALICE);
    }

    @Test
    void 같은_회원은_선점을_연장할_수_있다() {
        store.holdAll(GAME_ID, ALICE, List.of(seatA), TTL);
        clock.advance(Duration.ofMinutes(4));

        assertThat(store.holdAll(GAME_ID, ALICE, List.of(seatA, seatB), TTL)).isTrue();
        clock.advance(Duration.ofMinutes(4));

        assertThat(store.findOwners(GAME_ID, List.of(seatA, seatB)))
                .containsEntry(seatA, ALICE)
                .containsEntry(seatB, ALICE);
    }

    @Test
    void 만료된_선점은_다른_회원이_가져갈_수_있다() {
        store.holdAll(GAME_ID, ALICE, List.of(seatA), TTL);
        clock.advance(TTL);

        assertThat(store.findHolds(GAME_ID)).isEmpty();
        assertThat(store.holdAll(GAME_ID, BOB, List.of(seatA), TTL)).isTrue();
    }

    @Test
    void 본인이_선점한_좌석만_해제한다() {
        store.holdAll(GAME_ID, ALICE, List.of(seatA), TTL);

        store.release(GAME_ID, BOB, List.of(seatA));
        assertThat(store.findOwners(GAME_ID, List.of(seatA))).containsEntry(seatA, ALICE);

        store.release(GAME_ID, ALICE, List.of(seatA));
        assertThat(store.findOwners(GAME_ID, List.of(seatA))).isEmpty();
    }

    @Test
    void 경기별로_선점이_분리된다() {
        store.holdAll(GAME_ID, ALICE, List.of(seatA), TTL);

        assertThat(store.holdAll(2L, BOB, List.of(seatA), TTL)).isTrue();
        assertThat(store.findHolds(GAME_ID)).containsEntry(seatA, ALICE);
        assertThat(store.findHolds(2L)).containsEntry(seatA, BOB);
    }

    private static final class MutableClock extends Clock {

        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("Asia/Seoul");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
