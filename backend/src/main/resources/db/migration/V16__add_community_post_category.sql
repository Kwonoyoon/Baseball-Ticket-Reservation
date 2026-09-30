-- 게시글 분류(자유·경기·응원). 이미 있는 글은 자유로 둔다.
ALTER TABLE community_posts ADD COLUMN category VARCHAR(20) DEFAULT 'FREE' NOT NULL;

-- 구단 게시판을 분류별로 최신순으로 읽는다.
CREATE INDEX idx_community_posts_team_category ON community_posts (team_id, category, id DESC);
