package com.ballpark.ticketing.team;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.team.dto.TeamResponse;

@RestController
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping("/api/teams")
    public List<TeamResponse> getTeams() {
        return teamService.getTeams();
    }
}
