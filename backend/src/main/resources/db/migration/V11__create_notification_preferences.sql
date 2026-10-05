-- 원래 feature/알림시스템에서 V9였지만, develop의 V8·V9(회원 아이디·보안)와 번호가 겹쳐
-- 통합하면서 V11로 옮겼다. 번호를 옮겼을 뿐 내용은 그대로다.

CREATE TABLE notification_preferences (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT      NOT NULL,
    type      VARCHAR(30) NOT NULL,
    enabled   BOOLEAN     NOT NULL,
    CONSTRAINT uk_notification_preferences_member_type UNIQUE (member_id, type),
    CONSTRAINT fk_notification_preferences_member FOREIGN KEY (member_id) REFERENCES members (id)
);
