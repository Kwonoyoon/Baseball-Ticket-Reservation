package com.ballpark.ticketing.game.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.stadium.dto.SeatSectionResponse;
import com.ballpark.ticketing.stadium.dto.StadiumResponse;
import com.ballpark.ticketing.team.dto.TeamResponse;

public record GameDetailResponse(
        Long id,
        LocalDateTime startAt,
        TeamResponse homeTeam,
        TeamResponse awayTeam,
        StadiumResponse stadium,
        List<SeatSectionResponse> sections) implements Serializable {

    public static GameDetailResponse of(Game game, List<SeatSectionResponse> sections) {
        return new GameDetailResponse(game.getId(), game.getStartAt(), TeamResponse.from(game.getHomeTeam()),
                TeamResponse.from(game.getAwayTeam()), StadiumResponse.from(game.getStadium()), sections);
    }
}
