-- KBO 구단별 정규시즌 공식 성적. 순위표는 이 값이 있으면 이것으로, 없으면 이 사이트에 입력된 경기 결과로 계산한다.
-- (이 사이트의 경기는 연습용 샘플이라 결과를 직접 입력해서는 실제 순위가 나오지 않기 때문에, 공식 성적을 따로 둔다.)
CREATE TABLE team_records (
    team_id     BIGINT PRIMARY KEY,
    wins        INT  NOT NULL,
    losses      INT  NOT NULL,
    draws       INT  NOT NULL,
    -- 이 성적이 며칠 기준인지. 화면에 "N월 N일 기준"으로 보여 줄 때 쓴다.
    recorded_on DATE NOT NULL,
    CONSTRAINT fk_team_records_team FOREIGN KEY (team_id) REFERENCES teams (id)
);

-- 2026-10-06 기준 KBO 공식 순위표 (koreabaseball.com 팀 순위)
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 87, 49, 5, '2026-10-06' FROM teams WHERE code = 'KT';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 83, 54, 3, '2026-10-06' FROM teams WHERE code = 'SAMSUNG';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 75, 62, 2, '2026-10-06' FROM teams WHERE code = 'KIA';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 76, 63, 1, '2026-10-06' FROM teams WHERE code = 'LG';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 73, 64, 5, '2026-10-06' FROM teams WHERE code = 'DOOSAN';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 63, 73, 5, '2026-10-06' FROM teams WHERE code = 'SSG';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 63, 76, 2, '2026-10-06' FROM teams WHERE code = 'NC';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 61, 75, 3, '2026-10-06' FROM teams WHERE code = 'LOTTE';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 57, 81, 4, '2026-10-06' FROM teams WHERE code = 'HANWHA';
INSERT INTO team_records (team_id, wins, losses, draws, recorded_on)
SELECT id, 49, 90, 4, '2026-10-06' FROM teams WHERE code = 'KIWOOM';
