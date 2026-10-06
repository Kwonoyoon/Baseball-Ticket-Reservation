package com.ballpark.ticketing.reservation;

public enum ReservationStatus {
    /**
     * 좌석은 확보했고 결제창에서 결제를 기다리는 중. 예매내역에는 보이지 않는다.
     * 결제 시간(ticketing.reservation.payment-time-limit) 안에 결제하지 않거나 결제창을 닫으면 예매를 지우고 좌석을 푼다.
     */
    PENDING,
    CONFIRMED,
    CANCELED
}
