package com.ballpark.ticketing.game;

import java.time.LocalDateTime;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.stadium.Stadium;
import com.ballpark.ticketing.team.Team;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "games")
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "home_team_id")
    private Team homeTeam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "away_team_id")
    private Team awayTeam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stadium_id")
    private Stadium stadium;

    /** 경기 시작 시각 (Asia/Seoul) */
    @Column(nullable = false)
    private LocalDateTime startAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GameStatus status;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    protected Game() {
    }

    public Game(Team homeTeam, Team awayTeam, Stadium stadium, LocalDateTime startAt) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.stadium = stadium;
        this.startAt = startAt;
        this.status = GameStatus.SCHEDULED;
    }

    /** 경기가 예정 상태이고 시작 전까지만 예매와 취소가 가능하다. */
    public boolean isBookable(LocalDateTime now) {
        return status == GameStatus.SCHEDULED && now.isBefore(startAt);
    }

    public boolean involves(Long teamId) {
        return homeTeam.getId().equals(teamId) || awayTeam.getId().equals(teamId);
    }

    public Long getId() {
        return id;
    }

    public Team getHomeTeam() {
        return homeTeam;
    }

    public Team getAwayTeam() {
        return awayTeam;
    }

    public Stadium getStadium() {
        return stadium;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public GameStatus getStatus() {
        return status;
    }

    public Integer getHomeScore() {
        return homeScore;
    }

    public Integer getAwayScore() {
        return awayScore;
    }

    public void recordResult(int homeScore, int awayScore) {
        this.homeScore = homeScore;
        this.awayScore = awayScore;
        this.status = GameStatus.FINISHED;
    }

    /** 우천 등의 사유로 경기 자체를 취소한다. 이미 끝났거나 취소된 경기는 다시 취소할 수 없다. */
    public void cancel() {
        if (status != GameStatus.SCHEDULED) {
            throw new BusinessException(ErrorCode.GAME_NOT_CANCELABLE);
        }
        this.status = GameStatus.CANCELED;
    }
}
