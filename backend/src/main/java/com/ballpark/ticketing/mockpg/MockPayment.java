package com.ballpark.ticketing.mockpg;

import java.time.Duration;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.ballpark.ticketing.reservation.payment.PaymentMethod;

/** 가짜 결제 대행사의 결제 한 건. */
@Entity
@Table(name = "mock_pg_payments")
public class MockPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String paymentKey;

    @Column(nullable = false, length = 64)
    private String orderId;

    @Column(nullable = false, length = 100)
    private String orderName;

    @Column(nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Column(length = 30)
    private String cardCompany;

    @Column(nullable = false)
    private int installmentMonths;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MockPaymentStatus status;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime approvedAt;

    private LocalDateTime canceledAt;

    @Column(length = 200)
    private String cancelReason;

    protected MockPayment() {
    }

    private MockPayment(String paymentKey, String orderId, String orderName, int amount, PaymentMethod method,
            String cardCompany, int installmentMonths, MockPaymentStatus status, LocalDateTime requestedAt) {
        this.paymentKey = paymentKey;
        this.orderId = orderId;
        this.orderName = orderName;
        this.amount = amount;
        this.method = method;
        this.cardCompany = cardCompany;
        this.installmentMonths = installmentMonths;
        this.status = status;
        this.requestedAt = requestedAt;
    }

    /** 결제창에서 사용자가 인증을 마친 결제. 가맹점(우리 서버)의 승인 요청을 기다린다. */
    static MockPayment ready(String paymentKey, String orderId, String orderName, int amount, PaymentMethod method,
            String cardCompany, int installmentMonths, LocalDateTime now) {
        return new MockPayment(paymentKey, orderId, orderName, amount, method, cardCompany, installmentMonths,
                MockPaymentStatus.READY, now);
    }

    /** 결제창 없이 바로 승인된 결제 (등록된 간편결제로 즉시 결제하는 경우) */
    static MockPayment approvedNow(String paymentKey, String orderId, String orderName, int amount,
            PaymentMethod method, LocalDateTime now) {
        MockPayment payment = new MockPayment(paymentKey, orderId, orderName, amount, method, null, 0,
                MockPaymentStatus.DONE, now);
        payment.approvedAt = now;
        return payment;
    }

    boolean isExpired(LocalDateTime now, Duration approvalWindow) {
        return status == MockPaymentStatus.READY && !now.isBefore(requestedAt.plus(approvalWindow));
    }

    void approve(LocalDateTime now) {
        this.status = MockPaymentStatus.DONE;
        this.approvedAt = now;
    }

    void expire() {
        this.status = MockPaymentStatus.EXPIRED;
    }

    void cancel(String reason, LocalDateTime now) {
        this.status = MockPaymentStatus.CANCELED;
        this.cancelReason = reason;
        this.canceledAt = now;
    }

    public String getPaymentKey() {
        return paymentKey;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getOrderName() {
        return orderName;
    }

    public int getAmount() {
        return amount;
    }

    public PaymentMethod getMethod() {
        return method;
    }

    public MockPaymentStatus getStatus() {
        return status;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }
}
