package com.ballpark.ticketing.transfer;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.ballpark.ticketing.transfer.TransferPriority.Window;

/** 시간이 흐르는 규칙이라 통합 테스트로 재현하기 어렵다. 시각을 직접 넣어 경계를 확인한다. */
class TransferPriorityTest {

    private static final LocalDateTime LISTED = LocalDateTime.of(2026, 10, 5, 12, 0);
    private static final List<Long> QUEUE = List.of(11L, 22L, 33L);

    @Test
    void 열_분마다_다음_대기자에게_독점이_넘어간다() {
        assertThat(TransferPriority.current(LISTED, QUEUE, LISTED)).isEqualTo(new Window(11L, LISTED.plusMinutes(10)));
        // 정확히 10분이 되는 순간부터는 2번 차례다. (10분 안에는 1번)
        assertThat(TransferPriority.current(LISTED, QUEUE, LISTED.plusMinutes(9).plusSeconds(59)).holderId())
                .isEqualTo(11L);
        assertThat(TransferPriority.current(LISTED, QUEUE, LISTED.plusMinutes(10)).holderId()).isEqualTo(22L);
        assertThat(TransferPriority.current(LISTED, QUEUE, LISTED.plusMinutes(25)))
                .isEqualTo(new Window(33L, LISTED.plusMinutes(30)));
    }

    @Test
    void 모든_대기자의_시간이_지나면_누구나_살_수_있다() {
        assertThat(TransferPriority.current(LISTED, QUEUE, LISTED.plusMinutes(30))).isNull();
        assertThat(TransferPriority.current(LISTED, List.of(), LISTED)).isNull();
    }

    @Test
    void 줄_선_뒤쪽_사람의_순서는_대기_인원_기준이라_앞당겨지지_않는다() {
        // 대기자가 한 명이면 10분 뒤부터 일반 공개
        assertThat(TransferPriority.current(LISTED, List.of(11L), LISTED.plusMinutes(10))).isNull();
    }

    @Test
    void 우선순위는_양도글이_올라온_뒤에_줄_선_사람과_판매자를_뺀다() {
        TransferWait early = wait(11L, LISTED.minusMinutes(5));
        TransferWait seller = wait(99L, LISTED.minusMinutes(4));
        TransferWait atListing = wait(22L, LISTED);
        TransferWait late = wait(33L, LISTED.plusSeconds(1));

        assertThat(TransferPriority.queue(LISTED, 99L, List.of(early, seller, atListing, late)))
                .containsExactly(11L, 22L);
    }

    @Test
    void 우선_구매자는_최대_세_명이다() {
        List<TransferWait> waits = List.of(wait(1L, LISTED.minusMinutes(9)), wait(2L, LISTED.minusMinutes(8)),
                wait(3L, LISTED.minusMinutes(7)), wait(4L, LISTED.minusMinutes(6)));

        assertThat(TransferPriority.queue(LISTED, 99L, waits)).containsExactly(1L, 2L, 3L);
    }

    private static TransferWait wait(Long memberId, LocalDateTime createdAt) {
        return new TransferWait(memberId, null, createdAt);
    }
}
