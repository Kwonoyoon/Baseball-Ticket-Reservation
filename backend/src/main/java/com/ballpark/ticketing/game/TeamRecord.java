package com.ballpark.ticketing.game;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** KBO 공식 정규시즌 성적 한 줄. Team 과 연관을 걸지 않고 id 만 들고 있어서 순위 계산에서 Team 을 따로 읽는다. */
@Entity
@Table(name = "team_records")
public class TeamRecord {

    @Id
    private Long teamId;

    @Column(nullable = false)
    private int wins;

    @Column(nullable = false)
    private int losses;

    @Column(nullable = false)
    private int draws;

    @Column(nullable = false)
    private LocalDate recordedOn;

    protected TeamRecord() {
    }

    public TeamRecord(Long teamId, int wins, int losses, int draws, LocalDate recordedOn) {
        this.teamId = teamId;
        this.wins = wins;
        this.losses = losses;
        this.draws = draws;
        this.recordedOn = recordedOn;
    }

    public Long getTeamId() {
        return teamId;
    }

    public int getWins() {
        return wins;
    }

    public int getLosses() {
        return losses;
    }

    public int getDraws() {
        return draws;
    }

    public LocalDate getRecordedOn() {
        return recordedOn;
    }
}
