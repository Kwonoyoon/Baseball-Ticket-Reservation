package com.ballpark.ticketing.reservation.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentAbandonRequest(@NotBlank(message = "주문번호가 필요합니다.") String orderId) {
}
