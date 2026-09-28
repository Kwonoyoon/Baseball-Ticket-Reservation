-- 원래 feature/알림시스템에서 V8였지만, develop의 V8·V9(회원 아이디·보안)와 번호가 겹쳐
-- 통합하면서 V10로 옮겼다. 번호를 옮겼을 뿐 내용은 그대로다.

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
