package com.ballpark.ticketing.transfer.dto;

import com.ballpark.ticketing.reservation.payment.PaymentMethod;

import jakarta.validation.constraints.NotNull;

public record TransferBuyRequest(@NotNull(message = "결제 수단을 선택해 주세요.") PaymentMethod paymentMethod) {
}
