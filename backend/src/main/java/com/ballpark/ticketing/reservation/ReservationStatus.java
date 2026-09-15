package com.ballpark.ticketing.reservation;

public enum ReservationStatus {
    /** 좌석은 확보했고 결제 승인을 기다리는 중 (같은 트랜잭션 안에서만 존재한다) */
    PENDING,
    CONFIRMED,
    CANCELED
}
