package com.ballpark.ticketing.reservation;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param maxSeatsPerGame   한 회원이 한 경기에서 예매할 수 있는 최대 좌석 수 (취소한 좌석은 제외, 결제 대기는 포함)
 * @param paymentTimeLimit 결제 대기 예매를 유지하는 시간. 이 안에 결제를 마치지 않으면 예매를 지우고 좌석을 푼다.
 */
@ConfigurationProperties(prefix = "ticketing.reservation")
public record ReservationProperties(int maxSeatsPerGame, @DefaultValue("10m") Duration paymentTimeLimit) {
}
