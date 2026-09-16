-- 구역 이름을 '네이비석 1블록'에서 '네이비석 1번'으로 바꾼다.
-- 이미 적용된 V3, V5는 수정하지 않고 이름만 고친다.
-- 구역 이름은 경기 상세 캐시에 들어가므로, 배포 뒤 Redis의 ticketing:cache:* 를 비워야 화면에 반영된다.

UPDATE seat_sections SET name = REPLACE(name, '블록', '번') WHERE zone_code IS NOT NULL;
