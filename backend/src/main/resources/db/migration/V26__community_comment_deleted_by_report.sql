-- 신고 처리로 지운 댓글. 행은 남겨 두고(관리자가 원래 내용을 확인할 수 있게)
-- 게시글 화면에는 내용 대신 "신고 처리로 삭제된 댓글입니다."를 보여 준다.
ALTER TABLE community_comments ADD COLUMN deleted_by_report_at DATETIME(6);
