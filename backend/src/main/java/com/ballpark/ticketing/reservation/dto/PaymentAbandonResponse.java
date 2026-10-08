package com.ballpark.ticketing.reservation.dto;

/** 결제를 그만둔 뒤 좌석을 다시 고르러 갈 경기 */
public record PaymentAbandonResponse(Long gameId) {
}
