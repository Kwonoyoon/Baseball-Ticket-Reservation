-- 구단별 커뮤니티 게시판: 글, 댓글, 좋아요, 신고
CREATE TABLE community_posts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id       BIGINT       NOT NULL,
    member_id     BIGINT       NOT NULL,
    title         VARCHAR(100) NOT NULL,
    content       VARCHAR(4000) NOT NULL,
    view_count    INT          NOT NULL DEFAULT 0,
    like_count    INT          NOT NULL DEFAULT 0,
    comment_count INT          NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    CONSTRAINT fk_community_posts_team FOREIGN KEY (team_id) REFERENCES teams (id),
    CONSTRAINT fk_community_posts_member FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_community_posts_team ON community_posts (team_id, id DESC);

CREATE TABLE community_comments (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id    BIGINT       NOT NULL,
    member_id  BIGINT       NOT NULL,
    content    VARCHAR(1000) NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_community_comments_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_comments_member FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_community_comments_post ON community_comments (post_id, id);

-- 좋아요는 한 회원이 같은 글에 한 번만.
CREATE TABLE community_post_likes (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id    BIGINT      NOT NULL,
    member_id  BIGINT      NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_community_post_likes UNIQUE (post_id, member_id),
    CONSTRAINT fk_community_post_likes_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_post_likes_member FOREIGN KEY (member_id) REFERENCES members (id)
);

-- target_type='POST'|'COMMENT', target_id는 그 테이블의 id를 가리킨다. (대상이 지워지면 신고만 남는다)
CREATE TABLE community_reports (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(20)  NOT NULL,
    target_id   BIGINT       NOT NULL,
    reporter_id BIGINT       NOT NULL,
    reason      VARCHAR(500) NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT uk_community_reports UNIQUE (target_type, target_id, reporter_id),
    CONSTRAINT fk_community_reports_reporter FOREIGN KEY (reporter_id) REFERENCES members (id)
);
