ALTER TABLE members
    ADD COLUMN favorite_team_id BIGINT NULL;

ALTER TABLE members
    ADD CONSTRAINT fk_members_favorite_team FOREIGN KEY (favorite_team_id) REFERENCES teams (id);
