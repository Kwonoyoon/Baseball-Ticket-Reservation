package com.ballpark.ticketing.reservation;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 결제창을 열어 둔 채 떠난 결제 대기 예매를 1분마다 정리해 좌석을 다시 판다. */
@Component
public class PendingReservationCleaner {

    private final ReservationService reservationService;

    public PendingReservationCleaner(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT1M")
    public void expireOverduePayments() {
        reservationService.expireOverduePayments();
    }
}
