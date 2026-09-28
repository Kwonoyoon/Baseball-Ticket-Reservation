package com.ballpark.ticketing.game.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameStatus;
import com.ballpark.ticketing.stadium.dto.StadiumResponse;
import com.ballpark.ticketing.team.dto.TeamResponse;

public record GameSummaryResponse(
        Long id,
        LocalDateTime startAt,
        TeamResponse homeTeam,
        TeamResponse awayTeam,
        StadiumResponse stadium,
        GameStatus status,
        Integer homeScore,
        Integer awayScore) implements Serializable {

    public static GameSummaryResponse from(Game game) {
        return new GameSummaryResponse(game.getId(), game.getStartAt(), TeamResponse.from(game.getHomeTeam()),
                TeamResponse.from(game.getAwayTeam()), StadiumResponse.from(game.getStadium()), game.getStatus(),
                game.getHomeScore(), game.getAwayScore());
    }
}
