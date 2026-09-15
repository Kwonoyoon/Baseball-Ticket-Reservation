INSERT INTO stadiums (name, city) VALUES ('잠실야구장', '서울');
INSERT INTO stadiums (name, city) VALUES ('고척스카이돔', '서울');
INSERT INTO stadiums (name, city) VALUES ('인천SSG랜더스필드', '인천');
INSERT INTO stadiums (name, city) VALUES ('수원KT위즈파크', '수원');
INSERT INTO stadiums (name, city) VALUES ('대전한화생명볼파크', '대전');
INSERT INTO stadiums (name, city) VALUES ('대구삼성라이온즈파크', '대구');
INSERT INTO stadiums (name, city) VALUES ('광주-기아 챔피언스필드', '광주');
INSERT INTO stadiums (name, city) VALUES ('창원NC파크', '창원');
INSERT INTO stadiums (name, city) VALUES ('사직야구장', '부산');

INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'LG', 'LG 트윈스', 'LG', '#C30452', id FROM stadiums WHERE name = '잠실야구장';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'DOOSAN', '두산 베어스', '두산', '#131230', id FROM stadiums WHERE name = '잠실야구장';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'KIWOOM', '키움 히어로즈', '키움', '#820024', id FROM stadiums WHERE name = '고척스카이돔';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'SSG', 'SSG 랜더스', 'SSG', '#CE0E2D', id FROM stadiums WHERE name = '인천SSG랜더스필드';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'KT', 'KT 위즈', 'KT', '#000000', id FROM stadiums WHERE name = '수원KT위즈파크';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'HANWHA', '한화 이글스', '한화', '#FC4E00', id FROM stadiums WHERE name = '대전한화생명볼파크';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'SAMSUNG', '삼성 라이온즈', '삼성', '#074CA1', id FROM stadiums WHERE name = '대구삼성라이온즈파크';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'KIA', 'KIA 타이거즈', 'KIA', '#EA0029', id FROM stadiums WHERE name = '광주-기아 챔피언스필드';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'NC', 'NC 다이노스', 'NC', '#315288', id FROM stadiums WHERE name = '창원NC파크';
INSERT INTO teams (code, name, short_name, primary_color, stadium_id)
SELECT 'LOTTE', '롯데 자이언츠', '롯데', '#041E42', id FROM stadiums WHERE name = '사직야구장';

-- 모든 구장에 동일한 좌석 구역 템플릿을 적용한다.
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '중앙 프리미엄석', 'PREMIUM', 70000, 3, 10, 1 FROM stadiums;
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '1루 테이블석', 'TABLE', 45000, 4, 12, 2 FROM stadiums;
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '3루 테이블석', 'TABLE', 45000, 4, 12, 3 FROM stadiums;
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '1루 내야석', 'INFIELD', 20000, 8, 16, 4 FROM stadiums;
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '3루 내야석', 'INFIELD', 20000, 8, 16, 5 FROM stadiums;
INSERT INTO seat_sections (stadium_id, name, grade, price, seat_rows, seats_per_row, display_order)
SELECT id, '외야 자유석', 'OUTFIELD', 10000, 8, 20, 6 FROM stadiums;
