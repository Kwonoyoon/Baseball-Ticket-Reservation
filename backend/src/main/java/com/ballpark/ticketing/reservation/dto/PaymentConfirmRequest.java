package com.ballpark.ticketing.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/** 결제창에서 돌아온 결제 정보. 금액은 결제창이 넘겨준 값이라 서버가 주문 금액과 다시 비교한다. */
public record PaymentConfirmRequest(
        @NotBlank(message = "결제 정보가 필요합니다.") String paymentKey,
        @NotBlank(message = "주문번호가 필요합니다.") String orderId,
        @Positive(message = "결제 금액이 올바르지 않습니다.") int amount) {
}
