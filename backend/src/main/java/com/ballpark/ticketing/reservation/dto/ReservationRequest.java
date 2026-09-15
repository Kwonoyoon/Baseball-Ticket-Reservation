package com.ballpark.ticketing.reservation.dto;

import java.util.List;

import com.ballpark.ticketing.reservation.payment.PaymentMethod;
import com.ballpark.ticketing.seat.SeatPosition;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record ReservationRequest(
        @NotNull(message = "경기 정보가 필요합니다.") Long gameId,
        @NotEmpty(message = "좌석을 선택해 주세요.") List<@Valid SeatPosition> seats,
        @NotNull(message = "결제 수단을 선택해 주세요.") PaymentMethod paymentMethod) {
}
