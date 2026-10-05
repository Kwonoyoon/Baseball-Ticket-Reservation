-- 로그인에 쓰는 회원 아이디를 추가한다. (영문 소문자로 저장해 대소문자 구분 없이 로그인)
-- 이미 가입한 회원은 아이디가 없으므로 user{회원번호}로 채운다. 예) 3번 회원 → user3

ALTER TABLE members ADD COLUMN username VARCHAR(20) NULL;
UPDATE members SET username = CONCAT('user', id) WHERE username IS NULL;
ALTER TABLE members MODIFY COLUMN username VARCHAR(20) NOT NULL;
ALTER TABLE members ADD CONSTRAINT uk_members_username UNIQUE (username);
