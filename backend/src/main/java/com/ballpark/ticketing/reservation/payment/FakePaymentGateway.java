package com.ballpark.ticketing.reservation.payment;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 실제 결제 없이 항상 승인하는 가상 결제 게이트웨이.
 */
@Component
public class FakePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(FakePaymentGateway.class);

    @Override
    public PaymentResult pay(PaymentRequest request) {
        String transactionId = "FAKE-" + UUID.randomUUID();
        log.info("[가상 결제] 승인 orderId={}, amount={}, method={}, tx={}",
                request.orderId(), request.amount(), request.method(), transactionId);
        return PaymentResult.approved(transactionId);
    }

    @Override
    public void cancel(String transactionId, int amount) {
        log.info("[가상 결제] 취소 tx={}, amount={}", transactionId, amount);
    }
}
