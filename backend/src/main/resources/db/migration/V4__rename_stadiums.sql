-- 구장 이름을 홈 구단이 쓰는 공식 명칭으로 통일한다.
-- 이미 적용된 V2, V3는 수정하지 않고 이름만 바꾼다. (V3는 '잠실야구장'을 기준으로 먼저 실행된다)

UPDATE stadiums SET name = '서울종합운동장 야구장 (잠실)' WHERE name = '잠실야구장';
UPDATE stadiums SET name = '고척 스카이돔' WHERE name = '고척스카이돔';
UPDATE stadiums SET name = '인천 SSG 랜더스필드 (문학)' WHERE name = '인천SSG랜더스필드';
UPDATE stadiums SET name = '수원 케이티 위즈 파크' WHERE name = '수원KT위즈파크';
UPDATE stadiums SET name = '대전 한화생명 볼파크' WHERE name = '대전한화생명볼파크';
UPDATE stadiums SET name = '대구 삼성 라이온즈 파크' WHERE name = '대구삼성라이온즈파크';
UPDATE stadiums SET name = '광주-기아 챔피언스 필드' WHERE name = '광주-기아 챔피언스필드';
UPDATE stadiums SET name = '사직 야구장' WHERE name = '사직야구장';
