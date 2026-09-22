CREATE TABLE notification_preferences (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT      NOT NULL,
    type      VARCHAR(30) NOT NULL,
    enabled   BOOLEAN     NOT NULL,
    CONSTRAINT uk_notification_preferences_member_type UNIQUE (member_id, type),
    CONSTRAINT fk_notification_preferences_member FOREIGN KEY (member_id) REFERENCES members (id)
);
