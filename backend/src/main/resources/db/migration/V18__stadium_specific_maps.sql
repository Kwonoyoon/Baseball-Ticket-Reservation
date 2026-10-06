-- 구장별 좌석 배치도. 생성기(scripts/generate-stadium-map.py)가 만든 SQL이다. 직접 고치지 말고 다시 생성할 것.
-- 구장마다 code를 붙이고(배치도 frontend/src/lib/stadiumMaps.ts 와 이어진다),
-- 잠실을 뺀 8개 구장은 공통 블록을 숨기고 구장별 블록을 새로 넣는다.
-- 숨긴 블록은 예매 이력이 걸려 있어 지우지 않는다. (기존 예매는 그대로 유효하다)
-- 구역은 경기 상세 캐시에 들어가므로, 배포 뒤 Redis의 ticketing:cache:* 를 비워야 바로 반영된다.

ALTER TABLE stadiums ADD COLUMN code VARCHAR(20);

UPDATE stadiums SET code = 'JAMSIL' WHERE name = '서울종합운동장 야구장';
UPDATE stadiums SET code = 'GOCHEOK' WHERE name = '고척 스카이돔';
UPDATE stadiums SET code = 'MUNHAK' WHERE name = '인천 SSG 랜더스필드';
UPDATE stadiums SET code = 'SUWON' WHERE name = '수원 케이티 위즈 파크';
UPDATE stadiums SET code = 'DAEJEON' WHERE name = '대전 한화생명 볼파크';
UPDATE stadiums SET code = 'DAEGU' WHERE name = '대구 삼성 라이온즈 파크';
UPDATE stadiums SET code = 'GWANGJU' WHERE name = '광주-기아 챔피언스 필드';
UPDATE stadiums SET code = 'CHANGWON' WHERE name = '창원 NC 파크';
UPDATE stadiums SET code = 'SAJIK' WHERE name = '사직 야구장';

CREATE UNIQUE INDEX uk_stadiums_code ON stadiums (code);

-- 고척 스카이돔: 블록 46개, 좌석 6,984석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'GOCHEOK');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-01', '1층 내야석 1번', 'BLUE', 20000, 9, 18, 1, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-01', '2층 내야석 1번', 'SKY', 14000, 8, 18, 2, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-01', '3층 내야석 1번', 'NAVY', 9000, 8, 20, 3, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1번', 'TABLE', 45000, 4, 12, 4, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-02', '1층 내야석 2번', 'BLUE', 20000, 9, 18, 5, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-02', '2층 내야석 2번', 'SKY', 14000, 8, 18, 6, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-02', '3층 내야석 2번', 'NAVY', 9000, 8, 20, 7, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-03', '1층 내야석 3번', 'BLUE', 20000, 9, 18, 8, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2번', 'TABLE', 45000, 4, 12, 9, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-03', '2층 내야석 3번', 'SKY', 14000, 8, 18, 10, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-03', '3층 내야석 3번', 'NAVY', 9000, 8, 20, 11, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-04', '1층 내야석 4번', 'BLUE', 20000, 9, 18, 12, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-04', '2층 내야석 4번', 'SKY', 14000, 8, 18, 13, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-04', '3층 내야석 4번', 'NAVY', 9000, 8, 20, 14, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'DIAMOND-01', '다이아몬드석 1번', 'PREMIUM', 70000, 5, 14, 15, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-05', '1층 내야석 5번', 'BLUE', 20000, 9, 18, 16, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-05', '2층 내야석 5번', 'SKY', 14000, 8, 18, 17, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-05', '3층 내야석 5번', 'NAVY', 9000, 8, 20, 18, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'DIAMOND-02', '다이아몬드석 2번', 'PREMIUM', 70000, 5, 14, 19, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-06', '1층 내야석 6번', 'BLUE', 20000, 9, 18, 20, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-06', '3층 내야석 6번', 'NAVY', 9000, 8, 20, 21, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-06', '2층 내야석 6번', 'SKY', 14000, 8, 18, 22, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-07', '1층 내야석 7번', 'BLUE', 20000, 9, 18, 23, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'DIAMOND-03', '다이아몬드석 3번', 'PREMIUM', 70000, 5, 14, 24, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-07', '3층 내야석 7번', 'NAVY', 9000, 8, 20, 25, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-07', '2층 내야석 7번', 'SKY', 14000, 8, 18, 26, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LOWER-08', '1층 내야석 8번', 'BLUE', 20000, 9, 18, 27, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-08', '3층 내야석 8번', 'NAVY', 9000, 8, 20, 28, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '테이블석 3번', 'TABLE', 45000, 4, 12, 29, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-08', '2층 내야석 8번', 'SKY', 14000, 8, 18, 30, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원지정석 1번', 'CHEER', 16000, 9, 18, 31, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-09', '3층 내야석 9번', 'NAVY', 9000, 8, 20, 32, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-09', '2층 내야석 9번', 'SKY', 14000, 8, 18, 33, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-04', '테이블석 4번', 'TABLE', 45000, 4, 12, 34, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원지정석 2번', 'CHEER', 16000, 9, 18, 35, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-10', '3층 내야석 10번', 'NAVY', 9000, 8, 20, 36, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'MIDDLE-10', '2층 내야석 10번', 'SKY', 14000, 8, 18, 37, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원지정석 3번', 'CHEER', 16000, 9, 18, 38, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 8000, 10, 22, 39, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 8000, 10, 22, 40, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 8000, 10, 22, 41, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야석 4번', 'OUTFIELD', 8000, 10, 22, 42, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야석 5번', 'OUTFIELD', 8000, 10, 22, 43, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-06', '외야석 6번', 'OUTFIELD', 8000, 10, 22, 44, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-07', '외야석 7번', 'OUTFIELD', 8000, 10, 22, 45, TRUE FROM stadiums WHERE code = 'GOCHEOK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-08', '외야석 8번', 'OUTFIELD', 8000, 10, 22, 46, TRUE FROM stadiums WHERE code = 'GOCHEOK';

-- 인천 SSG 랜더스필드: 블록 42개, 좌석 9,761석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'MUNHAK');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-01', '내야필드석 1번', 'RED', 20000, 11, 25, 1, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-01', '스카이뷰석 1번', 'SKY', 10000, 10, 27, 2, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-02', '내야필드석 2번', 'RED', 20000, 11, 25, 3, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-02', '스카이뷰석 2번', 'SKY', 10000, 10, 27, 4, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1번', 'TABLE', 45000, 5, 15, 5, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-03', '내야필드석 3번', 'RED', 20000, 11, 25, 6, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-03', '스카이뷰석 3번', 'SKY', 10000, 10, 27, 7, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2번', 'TABLE', 45000, 5, 15, 8, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-04', '내야필드석 4번', 'RED', 20000, 11, 25, 9, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-04', '스카이뷰석 4번', 'SKY', 10000, 10, 27, 10, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-05', '내야필드석 5번', 'RED', 20000, 11, 25, 11, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-05', '스카이뷰석 5번', 'SKY', 10000, 10, 27, 12, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LIVE-01', '랜더스 라이브존 1번', 'EXCITING', 80000, 5, 15, 13, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PREMIUM-01', '프리미엄석 1번', 'PREMIUM', 60000, 6, 17, 14, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-06', '내야필드석 6번', 'RED', 20000, 11, 25, 15, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-06', '스카이뷰석 6번', 'SKY', 10000, 10, 27, 16, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-07', '내야필드석 7번', 'RED', 20000, 11, 25, 17, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-07', '스카이뷰석 7번', 'SKY', 10000, 10, 27, 18, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'LIVE-02', '랜더스 라이브존 2번', 'EXCITING', 80000, 5, 15, 19, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PREMIUM-02', '프리미엄석 2번', 'PREMIUM', 60000, 6, 17, 20, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-08', '내야필드석 8번', 'RED', 20000, 11, 25, 21, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-08', '스카이뷰석 8번', 'SKY', 10000, 10, 27, 22, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-09', '내야필드석 9번', 'RED', 20000, 11, 25, 23, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-09', '스카이뷰석 9번', 'SKY', 10000, 10, 27, 24, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '테이블석 3번', 'TABLE', 45000, 5, 15, 25, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원지정석 1번', 'CHEER', 16000, 11, 25, 26, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-10', '스카이뷰석 10번', 'SKY', 10000, 10, 27, 27, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-04', '테이블석 4번', 'TABLE', 45000, 5, 15, 28, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원지정석 2번', 'CHEER', 16000, 11, 25, 29, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-11', '스카이뷰석 11번', 'SKY', 10000, 10, 27, 30, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원지정석 3번', 'CHEER', 16000, 11, 25, 31, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYVIEW-12', '스카이뷰석 12번', 'SKY', 10000, 10, 27, 32, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원지정석 4번', 'CHEER', 16000, 11, 25, 33, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BBQ-01', '바비큐존 1번', 'PARTY', 50000, 5, 12, 34, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BBQ-02', '바비큐존 2번', 'PARTY', 50000, 5, 12, 35, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GREEN-01', '외야 그린존 1번', 'GRASS', 9000, 10, 30, 36, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GREEN-02', '외야 그린존 2번', 'GRASS', 9000, 10, 30, 37, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GREEN-03', '외야 그린존 3번', 'GRASS', 9000, 10, 30, 38, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GREEN-04', '외야 그린존 4번', 'GRASS', 9000, 10, 30, 39, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 10000, 12, 27, 40, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 10000, 12, 27, 41, TRUE FROM stadiums WHERE code = 'MUNHAK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 10000, 12, 27, 42, TRUE FROM stadiums WHERE code = 'MUNHAK';

-- 수원 케이티 위즈 파크: 블록 33개, 좌석 7,808석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'SUWON');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-01', '내야지정석 1번', 'ORANGE', 15000, 11, 22, 1, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-01', '스카이존 1번', 'SKY', 9000, 10, 25, 2, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-02', '내야지정석 2번', 'ORANGE', 15000, 11, 22, 3, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'EXCITING-01', '익사이팅석 1번', 'EXCITING', 40000, 5, 12, 4, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-02', '스카이존 2번', 'SKY', 9000, 10, 25, 5, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-03', '내야지정석 3번', 'ORANGE', 15000, 11, 22, 6, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-04', '내야지정석 4번', 'ORANGE', 15000, 11, 22, 7, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-03', '스카이존 3번', 'SKY', 9000, 10, 25, 8, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-04', '스카이존 4번', 'SKY', 9000, 10, 25, 9, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '중앙테이블석 1번', 'TABLE', 40000, 6, 15, 10, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CENTER-01', '중앙지정석 1번', 'BLUE', 22000, 11, 22, 11, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-05', '스카이존 5번', 'SKY', 9000, 10, 25, 12, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '중앙테이블석 2번', 'TABLE', 40000, 6, 15, 13, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CENTER-02', '중앙지정석 2번', 'BLUE', 22000, 11, 22, 14, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-06', '스카이존 6번', 'SKY', 9000, 10, 25, 15, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CENTER-03', '중앙지정석 3번', 'BLUE', 22000, 11, 22, 16, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '중앙테이블석 3번', 'TABLE', 40000, 6, 15, 17, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-07', '스카이존 7번', 'SKY', 9000, 10, 25, 18, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-08', '스카이존 8번', 'SKY', 9000, 10, 25, 19, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원지정석 1번', 'CHEER', 15000, 11, 22, 20, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원지정석 2번', 'CHEER', 15000, 11, 22, 21, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-09', '스카이존 9번', 'SKY', 9000, 10, 25, 22, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'EXCITING-02', '익사이팅석 2번', 'EXCITING', 40000, 5, 12, 23, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원지정석 3번', 'CHEER', 15000, 11, 22, 24, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-10', '스카이존 10번', 'SKY', 9000, 10, 25, 25, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원지정석 4번', 'CHEER', 15000, 11, 22, 26, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 9000, 12, 27, 27, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 9000, 12, 27, 28, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 9000, 12, 27, 29, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야석 4번', 'OUTFIELD', 9000, 12, 27, 30, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-01', '외야 잔디석 1번', 'GRASS', 7000, 10, 32, 31, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-02', '외야 잔디석 2번', 'GRASS', 7000, 10, 32, 32, TRUE FROM stadiums WHERE code = 'SUWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-03', '외야 잔디석 3번', 'GRASS', 7000, 10, 32, 33, TRUE FROM stadiums WHERE code = 'SUWON';

-- 대전 한화생명 볼파크: 블록 37개, 좌석 7,399석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'DAEJEON');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-01', '내야지정석 1번', 'ORANGE', 18000, 11, 21, 1, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-01', '2층 내야석 1번', 'SKY', 11000, 9, 24, 2, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-02', '내야지정석 2번', 'ORANGE', 18000, 11, 21, 3, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-02', '2층 내야석 2번', 'SKY', 11000, 9, 24, 4, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1번', 'TABLE', 40000, 5, 14, 5, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-03', '내야지정석 3번', 'ORANGE', 18000, 11, 21, 6, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-03', '2층 내야석 3번', 'SKY', 11000, 9, 24, 7, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-04', '내야지정석 4번', 'ORANGE', 18000, 11, 21, 8, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2번', 'TABLE', 40000, 5, 14, 9, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-05', '내야지정석 5번', 'ORANGE', 18000, 11, 21, 10, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-04', '2층 내야석 4번', 'SKY', 11000, 9, 24, 11, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-06', '내야지정석 6번', 'ORANGE', 18000, 11, 21, 12, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CATCHER-01', '포수후면석 1번', 'PREMIUM', 60000, 6, 14, 13, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-05', '2층 내야석 5번', 'SKY', 11000, 9, 24, 14, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-07', '내야지정석 7번', 'ORANGE', 18000, 11, 21, 15, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-06', '2층 내야석 6번', 'SKY', 11000, 9, 24, 16, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CATCHER-02', '포수후면석 2번', 'PREMIUM', 60000, 6, 14, 17, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-08', '내야지정석 8번', 'ORANGE', 18000, 11, 21, 18, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-07', '2층 내야석 7번', 'SKY', 11000, 9, 24, 19, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-09', '내야지정석 9번', 'ORANGE', 18000, 11, 21, 20, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '테이블석 3번', 'TABLE', 40000, 5, 14, 21, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-08', '2층 내야석 8번', 'SKY', 11000, 9, 24, 22, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원단석 1번', 'CHEER', 15000, 11, 21, 23, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-04', '테이블석 4번', 'TABLE', 40000, 5, 14, 24, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원단석 2번', 'CHEER', 15000, 11, 21, 25, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-09', '2층 내야석 9번', 'SKY', 11000, 9, 24, 26, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원단석 3번', 'CHEER', 15000, 11, 21, 27, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-10', '2층 내야석 10번', 'SKY', 11000, 9, 24, 28, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원단석 4번', 'CHEER', 15000, 11, 21, 29, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야지정석 1번', 'OUTFIELD', 9000, 11, 26, 30, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야지정석 2번', 'OUTFIELD', 9000, 11, 26, 31, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야지정석 3번', 'OUTFIELD', 9000, 11, 26, 32, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야지정석 4번', 'OUTFIELD', 9000, 11, 26, 33, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야지정석 5번', 'OUTFIELD', 9000, 11, 26, 34, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-06', '외야지정석 6번', 'OUTFIELD', 9000, 11, 26, 35, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'POOL-01', '인피니티풀 파티석 1번', 'PARTY', 60000, 4, 9, 36, TRUE FROM stadiums WHERE code = 'DAEJEON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'POOL-02', '인피니티풀 파티석 2번', 'PARTY', 60000, 4, 9, 37, TRUE FROM stadiums WHERE code = 'DAEJEON';

-- 대구 삼성 라이온즈 파크: 블록 39개, 좌석 10,225석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'DAEGU');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUEZONE-01', '블루존 1번', 'CHEER', 16000, 11, 25, 1, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-01', '스카이석 1번', 'SKY', 9000, 10, 28, 2, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUEZONE-02', '블루존 2번', 'CHEER', 16000, 11, 25, 3, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-02', '스카이석 2번', 'SKY', 9000, 10, 28, 4, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUEZONE-03', '블루존 3번', 'CHEER', 16000, 11, 25, 5, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1번', 'TABLE', 35000, 5, 15, 6, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-03', '스카이석 3번', 'SKY', 9000, 10, 28, 7, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUEZONE-04', '블루존 4번', 'CHEER', 16000, 11, 25, 8, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2번', 'TABLE', 35000, 5, 15, 9, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-04', '스카이석 4번', 'SKY', 9000, 10, 28, 10, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-01', '내야지정석 1번', 'BLUE', 15000, 11, 25, 11, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-05', '스카이석 5번', 'SKY', 9000, 10, 28, 12, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-02', '내야지정석 2번', 'BLUE', 15000, 11, 25, 13, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'VIP-01', 'VIP석 1번', 'PREMIUM', 70000, 6, 15, 14, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-06', '스카이석 6번', 'SKY', 9000, 10, 28, 15, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-03', '내야지정석 3번', 'BLUE', 15000, 11, 25, 16, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-07', '스카이석 7번', 'SKY', 9000, 10, 28, 17, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'VIP-02', 'VIP석 2번', 'PREMIUM', 70000, 6, 15, 18, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-04', '내야지정석 4번', 'BLUE', 15000, 11, 25, 19, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-08', '스카이석 8번', 'SKY', 9000, 10, 28, 20, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-05', '내야지정석 5번', 'BLUE', 15000, 11, 25, 21, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-09', '스카이석 9번', 'SKY', 9000, 10, 28, 22, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '테이블석 3번', 'TABLE', 35000, 5, 15, 23, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-06', '내야지정석 6번', 'BLUE', 15000, 11, 25, 24, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-10', '스카이석 10번', 'SKY', 9000, 10, 28, 25, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-07', '내야지정석 7번', 'BLUE', 15000, 11, 25, 26, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-04', '테이블석 4번', 'TABLE', 35000, 5, 15, 27, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-11', '스카이석 11번', 'SKY', 9000, 10, 28, 28, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-08', '내야지정석 8번', 'BLUE', 15000, 11, 25, 29, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-12', '스카이석 12번', 'SKY', 9000, 10, 28, 30, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-09', '내야지정석 9번', 'BLUE', 15000, 11, 25, 31, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-01', '외야 잔디석 1번', 'GRASS', 7000, 10, 33, 32, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-02', '외야 잔디석 2번', 'GRASS', 7000, 10, 33, 33, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-03', '외야 잔디석 3번', 'GRASS', 7000, 10, 33, 34, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야지정석 1번', 'OUTFIELD', 9000, 13, 28, 35, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야지정석 2번', 'OUTFIELD', 9000, 13, 28, 36, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야지정석 3번', 'OUTFIELD', 9000, 13, 28, 37, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야지정석 4번', 'OUTFIELD', 9000, 13, 28, 38, TRUE FROM stadiums WHERE code = 'DAEGU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야지정석 5번', 'OUTFIELD', 9000, 13, 28, 39, TRUE FROM stadiums WHERE code = 'DAEGU';

-- 광주-기아 챔피언스 필드: 블록 38개, 좌석 8,709석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'GWANGJU');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원특별석 1번', 'CHEER', 15000, 11, 25, 1, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-01', '스카이석 1번', 'SKY', 9000, 10, 25, 2, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원특별석 2번', 'CHEER', 15000, 11, 25, 3, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-02', '스카이석 2번', 'SKY', 9000, 10, 25, 4, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원특별석 3번', 'CHEER', 15000, 11, 25, 5, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-03', '스카이석 3번', 'SKY', 9000, 10, 25, 6, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원특별석 4번', 'CHEER', 15000, 11, 25, 7, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-04', '스카이석 4번', 'SKY', 9000, 10, 25, 8, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-05', '스카이석 5번', 'SKY', 9000, 10, 25, 9, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-01', '내야지정석 1번', 'RED', 15000, 11, 25, 10, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHAMPION-01', '챔피언석 1번', 'PREMIUM', 60000, 6, 15, 11, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '중앙테이블석 1번', 'TABLE', 40000, 5, 15, 12, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-02', '내야지정석 2번', 'RED', 15000, 11, 25, 13, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYTABLE-01', '스카이테이블석 1번', 'TABLE', 30000, 5, 15, 14, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-03', '내야지정석 3번', 'RED', 15000, 11, 25, 15, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHAMPION-02', '챔피언석 2번', 'PREMIUM', 60000, 6, 15, 16, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKYTABLE-02', '스카이테이블석 2번', 'TABLE', 30000, 5, 15, 17, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-04', '내야지정석 4번', 'RED', 15000, 11, 25, 18, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '중앙테이블석 2번', 'TABLE', 40000, 5, 15, 19, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHAMPION-03', '챔피언석 3번', 'PREMIUM', 60000, 6, 15, 20, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-05', '내야지정석 5번', 'RED', 15000, 11, 25, 21, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-06', '스카이석 6번', 'SKY', 9000, 10, 25, 22, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-06', '내야지정석 6번', 'RED', 15000, 11, 25, 23, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-07', '스카이석 7번', 'SKY', 9000, 10, 25, 24, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-07', '내야지정석 7번', 'RED', 15000, 11, 25, 25, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-08', '스카이석 8번', 'SKY', 9000, 10, 25, 26, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-09', '스카이석 9번', 'SKY', 9000, 10, 25, 27, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-08', '내야지정석 8번', 'RED', 15000, 11, 25, 28, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'SKY-10', '스카이석 10번', 'SKY', 9000, 10, 25, 29, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-09', '내야지정석 9번', 'RED', 15000, 11, 25, 30, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PARTY-01', '외야 파티석 1번', 'PARTY', 40000, 5, 12, 31, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PARTY-02', '외야 파티석 2번', 'PARTY', 40000, 5, 12, 32, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 8000, 12, 27, 33, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 8000, 12, 27, 34, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 8000, 12, 27, 35, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야석 4번', 'OUTFIELD', 8000, 12, 27, 36, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야석 5번', 'OUTFIELD', 8000, 12, 27, 37, TRUE FROM stadiums WHERE code = 'GWANGJU';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-06', '외야석 6번', 'OUTFIELD', 8000, 12, 27, 38, TRUE FROM stadiums WHERE code = 'GWANGJU';

-- 창원 NC 파크: 블록 32개, 좌석 7,644석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'CHANGWON');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-01', '내야석 1번', 'NAVY', 15000, 11, 23, 1, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-02', '내야석 2번', 'NAVY', 15000, 11, 23, 2, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1번', 'TABLE', 40000, 5, 15, 3, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-03', '내야석 3번', 'NAVY', 15000, 11, 23, 4, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-01', '3층 내야석 1번', 'SKY', 9000, 10, 25, 5, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-04', '내야석 4번', 'NAVY', 15000, 11, 23, 6, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2번', 'TABLE', 40000, 5, 15, 7, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-05', '내야석 5번', 'NAVY', 15000, 11, 23, 8, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-02', '3층 내야석 2번', 'SKY', 9000, 10, 25, 9, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-06', '내야석 6번', 'NAVY', 15000, 11, 23, 10, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PREMIUM-01', '프리미엄석 1번', 'PREMIUM', 60000, 6, 15, 11, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-03', '3층 내야석 3번', 'SKY', 9000, 10, 25, 12, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-07', '내야석 7번', 'NAVY', 15000, 11, 23, 13, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-04', '3층 내야석 4번', 'SKY', 9000, 10, 25, 14, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PREMIUM-02', '프리미엄석 2번', 'PREMIUM', 60000, 6, 15, 15, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-08', '내야석 8번', 'NAVY', 15000, 11, 23, 16, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-05', '3층 내야석 5번', 'SKY', 9000, 10, 25, 17, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'INFIELD-09', '내야석 9번', 'NAVY', 15000, 11, 23, 18, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-03', '테이블석 3번', 'TABLE', 40000, 5, 15, 19, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-06', '3층 내야석 6번', 'SKY', 9000, 10, 25, 20, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원석 1번', 'CHEER', 15000, 11, 23, 21, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원석 2번', 'CHEER', 15000, 11, 23, 22, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-04', '테이블석 4번', 'TABLE', 40000, 5, 15, 23, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원석 3번', 'CHEER', 15000, 11, 23, 24, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원석 4번', 'CHEER', 15000, 11, 23, 25, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-01', '외야 잔디석 1번', 'GRASS', 7000, 10, 35, 26, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-02', '외야 잔디석 2번', 'GRASS', 7000, 10, 35, 27, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-03', '외야 잔디석 3번', 'GRASS', 7000, 10, 35, 28, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'GRASS-04', '외야 잔디석 4번', 'GRASS', 7000, 10, 35, 29, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 9000, 13, 25, 30, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 9000, 13, 25, 31, TRUE FROM stadiums WHERE code = 'CHANGWON';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 9000, 13, 25, 32, TRUE FROM stadiums WHERE code = 'CHANGWON';

-- 사직 야구장: 블록 38개, 좌석 10,094석
UPDATE seat_sections SET active = FALSE WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = 'SAJIK');
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-01', '내야 필드석 1번', 'RED', 18000, 12, 21, 1, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-01', '내야 상단석 1번', 'NAVY', 10000, 12, 26, 2, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-02', '내야 필드석 2번', 'RED', 18000, 12, 21, 3, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-02', '내야 상단석 2번', 'NAVY', 10000, 12, 26, 4, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-03', '내야 필드석 3번', 'RED', 18000, 12, 21, 5, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'WTABLE-01', '와이드탁자석 1번', 'TABLE', 35000, 5, 16, 6, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-03', '내야 상단석 3번', 'NAVY', 10000, 12, 26, 7, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-04', '내야 필드석 4번', 'RED', 18000, 12, 21, 8, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-04', '내야 상단석 4번', 'NAVY', 10000, 12, 26, 9, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-05', '내야 필드석 5번', 'RED', 18000, 12, 21, 10, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-05', '내야 상단석 5번', 'NAVY', 10000, 12, 26, 11, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CTABLE-01', '중앙탁자석 1번', 'TABLE', 45000, 5, 14, 12, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-06', '내야 필드석 6번', 'RED', 18000, 12, 21, 13, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-06', '내야 상단석 6번', 'NAVY', 10000, 12, 26, 14, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-07', '내야 필드석 7번', 'RED', 18000, 12, 21, 15, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CTABLE-02', '중앙탁자석 2번', 'TABLE', 45000, 5, 14, 16, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-07', '내야 상단석 7번', 'NAVY', 10000, 12, 26, 17, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-08', '내야 필드석 8번', 'RED', 18000, 12, 21, 18, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CTABLE-03', '중앙탁자석 3번', 'TABLE', 45000, 5, 14, 19, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-08', '내야 상단석 8번', 'NAVY', 10000, 12, 26, 20, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'FIELD-09', '내야 필드석 9번', 'RED', 18000, 12, 21, 21, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-09', '내야 상단석 9번', 'NAVY', 10000, 12, 26, 22, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-01', '응원석 1번', 'CHEER', 15000, 12, 21, 23, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-10', '내야 상단석 10번', 'NAVY', 10000, 12, 26, 24, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'WTABLE-02', '와이드탁자석 2번', 'TABLE', 35000, 5, 16, 25, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-02', '응원석 2번', 'CHEER', 15000, 12, 21, 26, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-11', '내야 상단석 11번', 'NAVY', 10000, 12, 26, 27, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-03', '응원석 3번', 'CHEER', 15000, 12, 21, 28, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'UPPER-12', '내야 상단석 12번', 'NAVY', 10000, 12, 26, 29, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'CHEER-04', '응원석 4번', 'CHEER', 15000, 12, 21, 30, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1번', 'OUTFIELD', 8000, 13, 26, 31, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2번', 'OUTFIELD', 8000, 13, 26, 32, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3번', 'OUTFIELD', 8000, 13, 26, 33, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야석 4번', 'OUTFIELD', 8000, 13, 26, 34, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야석 5번', 'OUTFIELD', 8000, 13, 26, 35, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-06', '외야석 6번', 'OUTFIELD', 8000, 13, 26, 36, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-07', '외야석 7번', 'OUTFIELD', 8000, 13, 26, 37, TRUE FROM stadiums WHERE code = 'SAJIK';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-08', '외야석 8번', 'OUTFIELD', 8000, 13, 26, 38, TRUE FROM stadiums WHERE code = 'SAJIK';
