-- 공지: 시스템 업데이트·이벤트·점검 안내. 관리자가 쓰고 모두가 읽는다.
CREATE TABLE notices (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- GLOBAL: 헤더 메뉴의 전체 공지 / COMMUNITY: 커뮤니티 게시판 맨 위에 뜨는 공지
    scope      VARCHAR(20)   NOT NULL,
    -- UPDATE(시스템 업데이트) / EVENT(이벤트) / MAINTENANCE(점검)
    category   VARCHAR(20)   NOT NULL,
    title      VARCHAR(100)  NOT NULL,
    content    VARCHAR(4000) NOT NULL,
    author_id  BIGINT        NOT NULL,
    created_at DATETIME(6)   NOT NULL,
    updated_at DATETIME(6)   NOT NULL,
    CONSTRAINT fk_notices_author FOREIGN KEY (author_id) REFERENCES members (id)
);

CREATE INDEX idx_notices_scope ON notices (scope, id DESC);
