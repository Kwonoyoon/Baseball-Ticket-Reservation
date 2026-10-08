package com.ballpark.ticketing.notification;

import java.time.LocalDateTime;

/**
 * 양도 대기 메일에 들어가는 경기 정보와 내 순번.
 * 알림은 커밋 뒤(afterCommit)에 보내므로, 엔티티가 아니라 트랜잭션이 열려 있을 때 미리 뽑아 둔 값만 담는다.
 * 대기 취소 메일은 순번이 없어서 position이 0이다.
 */
public record WaitEmailContent(
        String homeTeamName,
        String awayTeamName,
        String stadiumName,
        LocalDateTime gameStartAt,
        int position) {
}
