package com.ballpark.ticketing.reservation.entry;

import java.time.LocalDateTime;

/**
 * 내 티켓 화면이 그리는 입장 정보. 시각은 다른 응답처럼 서울 시간이다.
 *
 * @param entryOpensAt     입장 시작 (평일 1시간 30분 전, 주말·공휴일 2시간 전)
 * @param gameStartsAt     경기 시작
 * @param gameEndsAt       이 시각부터 끝난 경기로 본다.
 * @param token            QR에 그대로 담을 서명 값. 경기가 끝났거나 취소됐으면 null
 * @param expiresInSeconds token이 유효한 초. token이 없으면 null
 */
public record EntryTicketResponse(
        LocalDateTime entryOpensAt,
        LocalDateTime gameStartsAt,
        LocalDateTime gameEndsAt,
        String token,
        Long expiresInSeconds) {
}
