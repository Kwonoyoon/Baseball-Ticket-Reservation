package com.ballpark.ticketing.transfer;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 대기자 우선 구매 규칙. 이 규칙의 숫자(몇 명에게, 몇 분씩)를 아는 곳은 이 클래스뿐이다.
 *
 * <p>양도글이 올라온 시각 T에 줄 서 있던 대기자 중 앞의 {@value #SLOT_COUNT}명에게 순서대로 독점 시간을 준다.
 * 1번은 T~T+10분, 2번은 T+10~20분, 3번은 T+20~30분. 모두 지나면 누구나 살 수 있다.
 * 현재 독점 시간은 저장하지 않고 지금 시각으로 그때그때 계산한다. 그래서 시간이 지나 다음 사람에게 넘기는
 * 배치 작업이 필요 없고, 서버가 재시작돼도 어긋나지 않는다.
 */
final class TransferPriority {

    static final int SLOT_COUNT = 3;
    static final Duration SLOT = Duration.ofMinutes(10);

    private TransferPriority() {
    }

    /** 지금 독점 중인 사람과 그 시간이 끝나는 때 */
    record Window(Long holderId, LocalDateTime until) {
    }

    /**
     * 양도글이 올라온 시각에 줄 서 있던 대기자의 우선 순서. 판매자 본인은 뺀다.
     * waits는 줄 선 순서로 정렬되어 있어야 한다. (뒤늦게 줄 선 사람은 이미 올라온 글에 순서를 끼어들 수 없다)
     */
    static List<Long> queue(LocalDateTime listedAt, Long sellerId, List<TransferWait> waits) {
        return waits.stream()
                .filter(wait -> !wait.getCreatedAt().isAfter(listedAt))
                .map(TransferWait::getMemberId)
                .filter(memberId -> !memberId.equals(sellerId))
                .limit(SLOT_COUNT)
                .toList();
    }

    /** 지금이 독점 시간이면 그 창, 아니면(대기자가 없거나 시간이 다 지났으면) null */
    static Window current(LocalDateTime listedAt, List<Long> queue, LocalDateTime now) {
        long slot = Duration.between(listedAt, now).dividedBy(SLOT);
        if (slot < 0 || slot >= queue.size()) {
            return null;
        }
        return new Window(queue.get((int) slot), listedAt.plus(SLOT.multipliedBy(slot + 1)));
    }

    /** 대기 순서(0부터)번째 사람의 독점 시작 시각 */
    static LocalDateTime startOf(LocalDateTime listedAt, int index) {
        return listedAt.plus(SLOT.multipliedBy(index));
    }

    static LocalDateTime endOf(LocalDateTime listedAt, int index) {
        return startOf(listedAt, index + 1);
    }
}
