package com.ballpark.ticketing.notification;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 예매 완료·취소 메일에 들어가는 경기·좌석·결제 정보.
 * 알림은 커밋 뒤(afterCommit)에 보내므로, 엔티티가 아니라 트랜잭션이 열려 있을 때 미리 뽑아 둔 값만 담는다.
 */
public record ReservationEmailContent(
        Long reservationId,
        String reservationNumber,
        String homeTeamName,
        String awayTeamName,
        String stadiumName,
        LocalDateTime gameStartAt,
        List<String> seatLabels,
        int totalPrice) {
}
