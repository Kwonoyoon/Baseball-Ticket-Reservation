package com.ballpark.ticketing.mockpg;

import org.springframework.stereotype.Component;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;

/** 예매 서버가 가짜 PG를 부르는 연결부. 실제 PG를 붙이면 이 클래스 대신 그 PG의 구현을 쓴다. */
@Component
public class MockPgPaymentGateway implements PaymentGateway {

    private final MockPgService mockPgService;

    public MockPgPaymentGateway(MockPgService mockPgService) {
        this.mockPgService = mockPgService;
    }

    @Override
    public PaymentResult confirm(String paymentKey, String orderId, int amount) {
        return toResult(mockPgService.confirm(paymentKey, orderId, amount));
    }

    @Override
    public PaymentResult pay(PaymentRequest request) {
        return toResult(mockPgService.payImmediately(request.orderId(), "예매번호 " + request.orderId(),
                request.amount(), request.method()));
    }

    @Override
    public void cancel(String transactionId, int amount) {
        MockPgResult result = mockPgService.cancel(transactionId, "예매 취소");
        if (!result.success()) {
            throw new BusinessException(ErrorCode.PAYMENT_FAILED, "환불하지 못했습니다. " + result.message());
        }
    }

    private static PaymentResult toResult(MockPgResult result) {
        return result.success() ? PaymentResult.approved(result.paymentKey()) : PaymentResult.failed(result.message());
    }
}
