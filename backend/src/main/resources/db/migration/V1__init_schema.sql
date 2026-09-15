CREATE TABLE stadiums (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50)  NOT NULL
);

CREATE TABLE teams (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    code          VARCHAR(20) NOT NULL,
    name          VARCHAR(50) NOT NULL,
    short_name    VARCHAR(20) NOT NULL,
    primary_color VARCHAR(7)  NOT NULL,
    stadium_id    BIGINT      NOT NULL,
    CONSTRAINT uk_teams_code UNIQUE (code),
    CONSTRAINT fk_teams_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id)
);

CREATE TABLE seat_sections (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    stadium_id    BIGINT      NOT NULL,
    name          VARCHAR(50) NOT NULL,
    grade         VARCHAR(20) NOT NULL,
    price         INT         NOT NULL,
    seat_rows     INT         NOT NULL,
    seats_per_row INT         NOT NULL,
    display_order INT         NOT NULL,
    CONSTRAINT fk_seat_sections_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id)
);

CREATE TABLE games (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    home_team_id BIGINT      NOT NULL,
    away_team_id BIGINT      NOT NULL,
    stadium_id   BIGINT      NOT NULL,
    start_at     DATETIME(6) NOT NULL,
    CONSTRAINT fk_games_home_team FOREIGN KEY (home_team_id) REFERENCES teams (id),
    CONSTRAINT fk_games_away_team FOREIGN KEY (away_team_id) REFERENCES teams (id),
    CONSTRAINT fk_games_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id)
);

CREATE INDEX idx_games_start_at ON games (start_at);

CREATE TABLE members (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    name       VARCHAR(50)  NOT NULL,
    role       VARCHAR(20)  NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    CONSTRAINT uk_members_email UNIQUE (email)
);

CREATE TABLE reservations (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_number     VARCHAR(20) NOT NULL,
    member_id              BIGINT      NOT NULL,
    game_id                BIGINT      NOT NULL,
    status                 VARCHAR(20) NOT NULL,
    total_price            INT         NOT NULL,
    payment_method         VARCHAR(20) NOT NULL,
    payment_transaction_id VARCHAR(64),
    created_at             DATETIME(6) NOT NULL,
    canceled_at            DATETIME(6),
    CONSTRAINT uk_reservations_number UNIQUE (reservation_number),
    CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT fk_reservations_game FOREIGN KEY (game_id) REFERENCES games (id)
);

CREATE INDEX idx_reservations_member ON reservations (member_id, created_at);

-- 예매 내역에 포함된 좌석 (취소 후에도 이력으로 남는다)
CREATE TABLE reservation_seats (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    section_id     BIGINT NOT NULL,
    row_no         INT    NOT NULL,
    seat_no        INT    NOT NULL,
    price          INT    NOT NULL,
    CONSTRAINT fk_reservation_seats_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_reservation_seats_section FOREIGN KEY (section_id) REFERENCES seat_sections (id)
);

-- 현재 판매된 좌석. 유니크 제약이 동시 예매 시 중복 판매를 막는 최종 방어선이다. 취소 시 행을 삭제한다.
CREATE TABLE sold_seats (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id        BIGINT NOT NULL,
    section_id     BIGINT NOT NULL,
    row_no         INT    NOT NULL,
    seat_no        INT    NOT NULL,
    reservation_id BIGINT NOT NULL,
    CONSTRAINT uk_sold_seats_seat UNIQUE (game_id, section_id, row_no, seat_no),
    CONSTRAINT fk_sold_seats_game FOREIGN KEY (game_id) REFERENCES games (id),
    CONSTRAINT fk_sold_seats_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (id)
);

CREATE INDEX idx_sold_seats_reservation ON sold_seats (reservation_id);
