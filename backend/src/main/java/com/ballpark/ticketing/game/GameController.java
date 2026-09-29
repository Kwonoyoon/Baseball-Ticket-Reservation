package com.ballpark.ticketing.game;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.game.dto.GameDetailResponse;
import com.ballpark.ticketing.game.dto.GameResultRequest;
import com.ballpark.ticketing.game.dto.GameSummaryResponse;

import jakarta.validation.Valid;

@RestController
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/api/games")
    public List<GameSummaryResponse> getSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long teamId) {
        return gameService.getSchedule(date, teamId);
    }

    @GetMapping("/api/games/{gameId}")
    public GameDetailResponse getGame(@PathVariable Long gameId) {
        return gameService.getGame(gameId);
    }

    /** 경기 결과 기록(관리자 전용). 접근 제어는 SecurityConfig에서 ROLE_ADMIN으로 막는다. */
    @PatchMapping("/api/games/{gameId}/result")
    public GameDetailResponse recordResult(@PathVariable Long gameId, @Valid @RequestBody GameResultRequest request) {
        return gameService.recordResult(gameId, request);
    }

    /** 경기 취소(관리자 전용, 우천취소 등). 접근 제어는 SecurityConfig에서 ROLE_ADMIN으로 막는다. */
    @PatchMapping("/api/games/{gameId}/cancel")
    public GameDetailResponse cancelGame(@PathVariable Long gameId) {
        return gameService.cancelGame(gameId);
    }
}
