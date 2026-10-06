package com.ballpark.ticketing.game;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.game.dto.StandingResponse;

@RestController
public class StandingController {

    private final StandingService standingService;

    public StandingController(StandingService standingService) {
        this.standingService = standingService;
    }

    @GetMapping("/api/standings")
    public List<StandingResponse> getStandings() {
        return standingService.getStandings();
    }
}
