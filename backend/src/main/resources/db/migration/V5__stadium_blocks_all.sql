-- 생성기(scripts/generate-stadium-map.py)가 만든 SQL이다. 직접 고치지 말고 다시 생성할 것.
-- 블록 구조는 모든 구장이 같고, 배치도(frontend/src/lib/stadiumBlocks.ts)와 zone_code로 이어진다.

-- 블록으로 나누기 전 템플릿 구역은 예매 이력이 있어 지우지 않고 숨긴다.
UPDATE seat_sections SET active = FALSE WHERE zone_code IS NULL;

INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-01', '네이비석 1블록', 'NAVY', 12000, 10, 22, 1, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-01', '레드석 1블록', 'RED', 16000, 10, 20, 2, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-01', '오렌지석 1블록', 'ORANGE', 18000, 9, 20, 3, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-01', '블루석 1블록', 'BLUE', 20000, 8, 18, 4, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-02', '네이비석 2블록', 'NAVY', 12000, 10, 22, 5, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'EXCITING-01', '익사이팅존 1블록', 'EXCITING', 50000, 4, 10, 6, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-02', '레드석 2블록', 'RED', 16000, 10, 20, 7, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-02', '오렌지석 2블록', 'ORANGE', 18000, 9, 20, 8, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-03', '네이비석 3블록', 'NAVY', 12000, 10, 22, 9, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-02', '블루석 2블록', 'BLUE', 20000, 8, 18, 10, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-03', '레드석 3블록', 'RED', 16000, 10, 20, 11, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-03', '오렌지석 3블록', 'ORANGE', 18000, 9, 20, 12, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-01', '테이블석 1블록', 'TABLE', 40000, 4, 12, 13, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-04', '네이비석 4블록', 'NAVY', 12000, 10, 22, 14, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-03', '블루석 3블록', 'BLUE', 20000, 8, 18, 15, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-04', '레드석 4블록', 'RED', 16000, 10, 20, 16, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-04', '오렌지석 4블록', 'ORANGE', 18000, 9, 20, 17, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-05', '네이비석 5블록', 'NAVY', 12000, 10, 22, 18, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-04', '블루석 4블록', 'BLUE', 20000, 8, 18, 19, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-05', '레드석 5블록', 'RED', 16000, 10, 20, 20, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-05', '오렌지석 5블록', 'ORANGE', 18000, 9, 20, 21, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-06', '네이비석 6블록', 'NAVY', 12000, 10, 22, 22, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'PREMIUM-01', '프리미엄석 1블록', 'PREMIUM', 70000, 5, 14, 23, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-07', '네이비석 7블록', 'NAVY', 12000, 10, 22, 24, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-06', '오렌지석 6블록', 'ORANGE', 18000, 9, 20, 25, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-06', '레드석 6블록', 'RED', 16000, 10, 20, 26, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-05', '블루석 5블록', 'BLUE', 20000, 8, 18, 27, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-08', '네이비석 8블록', 'NAVY', 12000, 10, 22, 28, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-07', '오렌지석 7블록', 'ORANGE', 18000, 9, 20, 29, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-07', '레드석 7블록', 'RED', 16000, 10, 20, 30, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-06', '블루석 6블록', 'BLUE', 20000, 8, 18, 31, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-09', '네이비석 9블록', 'NAVY', 12000, 10, 22, 32, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'TABLE-02', '테이블석 2블록', 'TABLE', 40000, 4, 12, 33, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-08', '오렌지석 8블록', 'ORANGE', 18000, 9, 20, 34, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-08', '레드석 8블록', 'RED', 16000, 10, 20, 35, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-07', '블루석 7블록', 'BLUE', 20000, 8, 18, 36, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-10', '네이비석 10블록', 'NAVY', 12000, 10, 22, 37, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-09', '오렌지석 9블록', 'ORANGE', 18000, 9, 20, 38, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-09', '레드석 9블록', 'RED', 16000, 10, 20, 39, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'EXCITING-02', '익사이팅존 2블록', 'EXCITING', 50000, 4, 10, 40, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-11', '네이비석 11블록', 'NAVY', 12000, 10, 22, 41, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'BLUE-08', '블루석 8블록', 'BLUE', 20000, 8, 18, 42, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'ORANGE-10', '오렌지석 10블록', 'ORANGE', 18000, 9, 20, 43, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'RED-10', '레드석 10블록', 'RED', 16000, 10, 20, 44, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'NAVY-12', '네이비석 12블록', 'NAVY', 12000, 10, 22, 45, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-01', '외야석 1블록', 'OUTFIELD', 9000, 12, 24, 46, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-02', '외야석 2블록', 'OUTFIELD', 9000, 12, 24, 47, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-03', '외야석 3블록', 'OUTFIELD', 9000, 12, 24, 48, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-04', '외야석 4블록', 'OUTFIELD', 9000, 12, 24, 49, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-05', '외야석 5블록', 'OUTFIELD', 9000, 12, 24, 50, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-06', '외야석 6블록', 'OUTFIELD', 9000, 12, 24, 51, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-07', '외야석 7블록', 'OUTFIELD', 9000, 12, 24, 52, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
INSERT INTO seat_sections (stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)
SELECT id, 'OUTFIELD-08', '외야석 8블록', 'OUTFIELD', 9000, 12, 24, 53, TRUE FROM stadiums
WHERE name <> '서울종합운동장 야구장 (잠실)';
