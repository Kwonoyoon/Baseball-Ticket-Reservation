package com.ballpark.ticketing.game.dto;

/** 메인 화면 "매진 임박" 경기. soldSeats ÷ totalSeats가 예매율이다. */
public record HotGameResponse(GameSummaryResponse game, int soldSeats, int totalSeats) {
}
