package com.ballpark.ticketing.seat;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param store    선점 저장소 구현 ({@code redis} 또는 {@code memory})
 * @param ttl      좌석 선점 유지 시간. 이 시간 안에 결제를 마쳐야 한다.
 * @param maxSeats 한 번에 선점/예매할 수 있는 최대 좌석 수
 */
@ConfigurationProperties(prefix = "ticketing.seat-hold")
public record SeatHoldProperties(String store, Duration ttl, int maxSeats) {
}
