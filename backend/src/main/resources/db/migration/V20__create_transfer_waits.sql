-- 양도 대기 등록: "이 경기 양도글이 올라오면 먼저 살 수 있게 해 주세요"
CREATE TABLE transfer_waits (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id  BIGINT      NOT NULL,
    game_id    BIGINT      NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_transfer_waits_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_transfer_waits_game FOREIGN KEY (game_id) REFERENCES games (id),
    -- 같은 경기에 같은 사람이 두 번 줄 서서 순서를 선점하지 못하게 한다.
    CONSTRAINT uk_transfer_waits_member_game UNIQUE (member_id, game_id)
);

CREATE INDEX idx_transfer_waits_game ON transfer_waits (game_id, created_at, id);
