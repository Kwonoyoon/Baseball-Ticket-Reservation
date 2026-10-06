package com.ballpark.ticketing.reservation.payment;

/**
 * 결제 대행사(PG) 연동 경계. 지금은 가짜 PG(mockpg)를 쓰고, 실제 PG를 붙일 때 이 인터페이스의 구현만 교체한다.
 *
 * <p>결제창 결제는 두 단계다. 사용자가 브라우저 결제창에서 인증하면 PG가 결제 키를 주고,
 * 우리 서버가 {@link #confirm}으로 승인을 요청해야 실제로 결제된다.
 * PG 호출은 바깥 시스템 호출이므로 우리 DB 트랜잭션 밖에서 부르는 것이 원칙이다.
 */
public interface PaymentGateway {

    /** 결제창에서 인증한 결제를 승인한다. 금액·주문번호는 우리 주문 기준 값으로 넘긴다. */
    PaymentResult confirm(String paymentKey, String orderId, int amount);

    /** 결제창 없이 바로 결제한다. (양도 구매처럼 등록된 간편결제로 즉시 결제하는 경우) */
    PaymentResult pay(PaymentRequest request);

    /** 승인된 결제를 환불한다. 이미 환불된 결제는 다시 환불하지 않는다. */
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
