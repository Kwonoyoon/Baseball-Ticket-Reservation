package com.ballpark.ticketing.reservation.payment;

/**
 * 결제 대행사(PG) 연동 경계. 실제 PG를 붙일 때 이 인터페이스의 구현만 교체한다.
 */
public interface PaymentGateway {

    PaymentResult pay(PaymentRequest request);

    void cancel(String transactionId, int amount);

    record PaymentRequest(Long memberId, String orderId, int amount, PaymentMethod method) {
    }

    record PaymentResult(boolean approved, String transactionId, String failureReason) {

        public static PaymentResult approved(String transactionId) {
            return new PaymentResult(true, transactionId, null);
        }

        public static PaymentResult failed(String reason) {
            return new PaymentResult(false, null, reason);
        }
    }
}
