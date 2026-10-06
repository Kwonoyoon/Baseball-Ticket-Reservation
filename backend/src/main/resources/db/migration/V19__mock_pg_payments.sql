-- 가짜 결제 대행사(mockpg)의 결제 기록. 우리 예매 테이블과는 따로 두어 바깥 결제사처럼 다룬다.
-- 결제창에서 승인하면 READY, 우리 서버가 승인(confirm)하면 DONE, 환불하면 CANCELED,
-- 결제창 승인 뒤 일정 시간 안에 승인 요청이 오지 않으면 EXPIRED가 된다.
CREATE TABLE mock_pg_payments (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_key        VARCHAR(64)  NOT NULL,
    order_id           VARCHAR(64)  NOT NULL,
    order_name         VARCHAR(100) NOT NULL,
    amount             INT          NOT NULL,
    method             VARCHAR(20)  NOT NULL,
    card_company       VARCHAR(30),
    installment_months INT          DEFAULT 0 NOT NULL,
    status             VARCHAR(20)  NOT NULL,
    requested_at       DATETIME(6)  NOT NULL,
    approved_at        DATETIME(6),
    canceled_at        DATETIME(6),
    cancel_reason      VARCHAR(200),
    CONSTRAINT uk_mock_pg_payments_key UNIQUE (payment_key)
);

CREATE INDEX idx_mock_pg_payments_order ON mock_pg_payments (order_id);
CREATE INDEX idx_mock_pg_payments_status ON mock_pg_payments (status, requested_at);

-- 결제를 기다리는 예매(PENDING)를 시간이 지나면 정리하려고 찾는다.
CREATE INDEX idx_reservations_status_created ON reservations (status, created_at);
