package com.ballpark.ticketing.reservation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param maxSeatsPerGame 한 회원이 한 경기에서 예매할 수 있는 최대 좌석 수 (취소한 좌석은 제외)
 */
@ConfigurationProperties(prefix = "ticketing.reservation")
public record ReservationProperties(int maxSeatsPerGame) {
}
