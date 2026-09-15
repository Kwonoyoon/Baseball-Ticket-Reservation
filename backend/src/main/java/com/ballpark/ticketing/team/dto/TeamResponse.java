package com.ballpark.ticketing.team.dto;

import java.io.Serializable;

import com.ballpark.ticketing.team.Team;

public record TeamResponse(Long id, String code, String name, String shortName, String primaryColor)
        implements Serializable {

    public static TeamResponse from(Team team) {
        return new TeamResponse(team.getId(), team.getCode(), team.getName(), team.getShortName(),
                team.getPrimaryColor());
    }
}
