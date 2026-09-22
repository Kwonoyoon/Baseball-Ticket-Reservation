CREATE TABLE notifications (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id  BIGINT       NOT NULL,
    type       VARCHAR(30)  NOT NULL,
    title      VARCHAR(100) NOT NULL,
    message    VARCHAR(500) NOT NULL,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_notifications_member FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_notifications_member ON notifications (member_id, created_at);
