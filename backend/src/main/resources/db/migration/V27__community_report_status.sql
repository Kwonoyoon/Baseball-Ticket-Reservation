-- 신고 처리 상태. PENDING(처리전) / DELETED(신고 대상을 지움) / REJECTED(반려)
ALTER TABLE community_reports ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE community_reports ADD COLUMN processed_at DATETIME(6);

-- 이미 대상이 지워진 신고는 삭제로 처리된 것으로 본다. (언제 지웠는지는 알 수 없어 처리 시각은 비운다)
UPDATE community_reports
SET status = 'DELETED'
WHERE (target_type = 'POST' AND target_id NOT IN (SELECT id FROM community_posts))
   OR (target_type = 'COMMENT'
       AND target_id NOT IN (SELECT id FROM community_comments WHERE deleted_by_report_at IS NULL));
