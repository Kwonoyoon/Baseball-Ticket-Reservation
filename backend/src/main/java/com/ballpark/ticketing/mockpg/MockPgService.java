package com.ballpark.ticketing.mockpg;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.reservation.payment.PaymentMethod;

/**
 * 가짜 결제 대행사(PG). 실제 돈은 오가지 않지만 토스페이먼츠 같은 PG의 흐름을 흉내 낸다.
 *
 * <ol>
 *   <li>결제창: 사용자가 결제 수단을 고르고 인증하면 결제 키(paymentKey)를 발급한다. 이때는 아직 돈이 빠져나가지 않는다(READY).</li>
 *   <li>승인: 가맹점(우리 예매 서버)이 결제 키·주문번호·금액으로 승인을 요청해야 돈이 빠져나간다(DONE).
 *       결제창에서 넘어온 금액이 조작됐을 수 있으므로 가맹점이 자기 주문 금액과 맞는지 확인한 뒤 승인한다.</li>
 *   <li>환불: 승인된 결제를 취소한다(CANCELED).</li>
 * </ol>
 *
 * <p>바깥 결제사처럼 다루려고 모든 처리를 별도 트랜잭션(REQUIRES_NEW)으로 커밋한다.
 * 가맹점 쪽 트랜잭션이 롤백돼도 결제 기록은 남는다(실제 PG와 같다). 그래서 가맹점은 실패 시 환불을 직접 요청해야 한다.
 */
@Service
@Transactional(propagation = Propagation.REQUIRES_NEW)
public class MockPgService {

    private static final Logger log = LoggerFactory.getLogger(MockPgService.class);

    /** 결제창 인증 뒤 이 시간 안에 승인 요청이 와야 한다. 넘으면 결제가 무효(EXPIRED)가 된다. */
    static final Duration APPROVAL_WINDOW = Duration.ofMinutes(10);
    private static final String KEY_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int KEY_LENGTH = 32;

    private final MockPaymentRepository repository;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public MockPgService(MockPaymentRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** 결제창에서 사용자가 인증을 마쳤을 때. 테스트 결과로 거절을 고르면 결제 키 없이 실패를 돌려준다. */
    public MockPgResult checkout(String orderId, String orderName, int amount, PaymentMethod method,
            String cardCompany, int installmentMonths, MockPgTestOutcome outcome) {
        if (orderId == null || orderId.isBlank() || amount <= 0 || method == null) {
            return MockPgResult.failed("INVALID_REQUEST", "결제 요청 정보가 올바르지 않습니다.");
        }
        if (outcome != null && outcome != MockPgTestOutcome.APPROVE) {
            log.info("[가짜 PG] 결제창 거절 orderId={}, 사유={}", orderId, outcome);
            return MockPgResult.failed(outcome.name(), outcome.getMessage());
        }
        MockPayment payment = repository.save(MockPayment.ready(newPaymentKey(), orderId, orderName, amount, method,
                method == PaymentMethod.CARD ? cardCompany : null, method == PaymentMethod.CARD ? installmentMonths : 0,
                LocalDateTime.now(clock)));
        log.info("[가짜 PG] 결제창 인증 완료 orderId={}, amount={}, method={}, paymentKey={}",
                orderId, amount, method, payment.getPaymentKey());
        return MockPgResult.ok(payment.getPaymentKey());
    }

    /**
     * 가맹점의 승인 요청. 결제 키·주문번호·금액이 결제창에서 인증한 것과 모두 같아야 승인한다.
     * 이미 같은 내용으로 승인된 결제면 다시 승인한 것으로 본다(중복 요청에 안전하다).
     */
    public MockPgResult confirm(String paymentKey, String orderId, int amount) {
        MockPayment payment = repository.findForUpdateByPaymentKey(paymentKey).orElse(null);
        if (payment == null) {
            return MockPgResult.failed("NOT_FOUND_PAYMENT", "존재하지 않는 결제입니다.");
        }
        if (!payment.getOrderId().equals(orderId) || payment.getAmount() != amount) {
            return MockPgResult.failed("INVALID_REQUEST", "결제 정보가 결제창에서 인증한 내용과 다릅니다.");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        switch (payment.getStatus()) {
            case DONE:
                return MockPgResult.ok(paymentKey);
            case READY:
                if (payment.isExpired(now, APPROVAL_WINDOW)) {
                    payment.expire();
                    return MockPgResult.failed("EXPIRED_PAYMENT", "결제 승인 시간이 지났습니다.");
                }
                payment.approve(now);
                log.info("[가짜 PG] 승인 orderId={}, amount={}, paymentKey={}", orderId, amount, paymentKey);
                return MockPgResult.ok(paymentKey);
            default:
                return MockPgResult.failed("NOT_APPROVABLE", "승인할 수 없는 결제입니다. (" + payment.getStatus() + ")");
        }
    }

    /** 결제창 없이 바로 승인한다. (양도 구매처럼 등록된 간편결제로 즉시 결제하는 경우) */
    public MockPgResult payImmediately(String orderId, String orderName, int amount, PaymentMethod method) {
        if (amount <= 0 || method == null) {
            return MockPgResult.failed("INVALID_REQUEST", "결제 요청 정보가 올바르지 않습니다.");
        }
        MockPayment payment = repository.save(MockPayment.approvedNow(newPaymentKey(), orderId, orderName, amount,
                method, LocalDateTime.now(clock)));
        log.info("[가짜 PG] 즉시 승인 orderId={}, amount={}, paymentKey={}", orderId, amount, payment.getPaymentKey());
        return MockPgResult.ok(payment.getPaymentKey());
    }

    /**
     * 환불. 이미 환불된 결제면 아무것도 하지 않는다(중복 요청에 안전하다).
     * 가짜 PG가 생기기 전 결제(FAKE-…)처럼 기록이 없는 결제는 환불할 것이 없으므로 건너뛴다.
     */
    public MockPgResult cancel(String paymentKey, String reason) {
        MockPayment payment = paymentKey == null ? null : repository.findForUpdateByPaymentKey(paymentKey).orElse(null);
        if (payment == null) {
            log.info("[가짜 PG] 기록이 없는 결제라 환불을 건너뜁니다. paymentKey={}", paymentKey);
            return MockPgResult.ok(paymentKey);
        }
        switch (payment.getStatus()) {
            case CANCELED:
                return MockPgResult.ok(paymentKey);
            case DONE:
                payment.cancel(reason, LocalDateTime.now(clock));
                log.info("[가짜 PG] 환불 orderId={}, amount={}, paymentKey={}, 사유={}",
                        payment.getOrderId(), payment.getAmount(), paymentKey, reason);
                return MockPgResult.ok(paymentKey);
            default:
                return MockPgResult.failed("NOT_CANCELABLE_PAYMENT", "환불할 수 없는 결제입니다. (" + payment.getStatus() + ")");
        }
    }

    /** 결제창 인증 뒤 승인 요청이 오지 않은 결제를 무효로 돌린다. 돈은 빠져나가지 않았으므로 환불할 것은 없다. */
    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT1M")
    public void expireStalePayments() {
        LocalDateTime before = LocalDateTime.now(clock).minus(APPROVAL_WINDOW);
        repository.findAllByStatusRequestedBefore(MockPaymentStatus.READY, before).forEach(MockPayment::expire);
    }

    private String newPaymentKey() {
        StringBuilder key = new StringBuilder("mpk_");
        for (int i = 0; i < KEY_LENGTH; i++) {
            key.append(KEY_CHARS.charAt(random.nextInt(KEY_CHARS.length())));
        }
        return key.toString();
    }
}
