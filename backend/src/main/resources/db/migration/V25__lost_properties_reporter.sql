-- 분실물을 누가 올렸는지 남긴다. 작성자 기록이 없어서 욕설·광고가 올라와도 누가 썼는지 모르고, 본인도 지울 수 없었다.
-- 이미 올라온 글은 작성자를 알 수 없으니 NULL로 둔다. (NULL인 글은 관리자만 지울 수 있다)
ALTER TABLE lost_properties ADD COLUMN reporter_id BIGINT NULL;
ALTER TABLE lost_properties ADD CONSTRAINT fk_lost_properties_reporter FOREIGN KEY (reporter_id) REFERENCES members (id);
