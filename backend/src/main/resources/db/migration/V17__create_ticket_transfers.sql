-- 정가 양도 마켓: 예매 한 건을 통째로 정가에 넘기는 양도글
CREATE TABLE ticket_transfers (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id      BIGINT      NOT NULL,
    seller_id           BIGINT      NOT NULL,
    buyer_id            BIGINT      NULL,
    price               INT         NOT NULL,
    status              VARCHAR(20) NOT NULL,
    -- 양도글이 OPEN일 때만 reservation_id와 같은 값을 넣고, 닫히면 NULL로 비운다.
    -- UNIQUE 인덱스는 NULL끼리는 충돌하지 않으므로 "예매 한 건에 열린 양도글은 하나"를 DB가 보장한다.
    -- (MySQL에는 조건부 유니크 인덱스가 없어서 이렇게 우회한다)
    open_reservation_id BIGINT      NULL,
    created_at          DATETIME(6) NOT NULL,
    closed_at           DATETIME(6) NULL,
    CONSTRAINT fk_ticket_transfers_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_ticket_transfers_seller FOREIGN KEY (seller_id) REFERENCES members (id),
    CONSTRAINT fk_ticket_transfers_buyer FOREIGN KEY (buyer_id) REFERENCES members (id),
    CONSTRAINT uk_ticket_transfers_open_reservation UNIQUE (open_reservation_id)
);

CREATE INDEX idx_ticket_transfers_status ON ticket_transfers (status, id DESC);
CREATE INDEX idx_ticket_transfers_seller ON ticket_transfers (seller_id, id DESC);
