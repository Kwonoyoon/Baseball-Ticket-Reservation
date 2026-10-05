-- 로그인 보안: 계정 상태(잠금·탈퇴), 로그인 실패 횟수, 비밀번호 변경 시각, 리프레시 토큰 저장소
-- password_changed_at보다 먼저 발급된 액세스 토큰은 더 이상 인정하지 않는다. (비밀번호를 바꾸면 다른 기기 로그아웃)

ALTER TABLE members ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE members ADD COLUMN failed_login_attempts INT DEFAULT 0 NOT NULL;
ALTER TABLE members ADD COLUMN password_changed_at DATETIME(6) NULL;
ALTER TABLE members ADD COLUMN last_login_at DATETIME(6) NULL;
ALTER TABLE members ADD COLUMN withdrawn_at DATETIME(6) NULL;
UPDATE members SET password_changed_at = created_at WHERE password_changed_at IS NULL;
ALTER TABLE members MODIFY COLUMN password_changed_at DATETIME(6) NOT NULL;

-- 리프레시 토큰은 원문 대신 SHA-256 해시만 저장한다.
-- family_id: 한 번의 로그인에서 이어지는 토큰 묶음. 이미 교체된 토큰이 다시 쓰이면(탈취 의심) 묶음 전체를 폐기한다.
CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id   BIGINT      NOT NULL,
    token_hash  CHAR(64)    NOT NULL,
    family_id   CHAR(36)    NOT NULL,
    persistent  BOOLEAN     NOT NULL,
    expires_at  DATETIME(6) NOT NULL,
    created_at  DATETIME(6) NOT NULL,
    revoked_at  DATETIME(6),
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_member FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_refresh_tokens_member ON refresh_tokens (member_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
