-- 구장 이름 표기를 정리한다. 창원만 띄어쓰기가 없었고, 잠실·문학은 괄호 별칭을 달고 있었다.
-- 이미 적용된 V4는 수정하지 않고 이름만 고친다.
-- 구장 이름은 경기 목록·상세 캐시에 들어가므로, 배포 뒤 Redis의 ticketing:cache:* 를 비워야 화면에 반영된다.

UPDATE stadiums SET name = '창원 NC 파크' WHERE name = '창원NC파크';
UPDATE stadiums SET name = '서울종합운동장 야구장' WHERE name = '서울종합운동장 야구장 (잠실)';
UPDATE stadiums SET name = '인천 SSG 랜더스필드' WHERE name = '인천 SSG 랜더스필드 (문학)';
