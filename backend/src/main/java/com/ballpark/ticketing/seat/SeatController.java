package com.ballpark.ticketing.seat;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.seat.dto.HoldRequest;
import com.ballpark.ticketing.seat.dto.HoldResponse;
import com.ballpark.ticketing.seat.dto.SeatStatusResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/games/{gameId}")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    /** 비로그인 사용자도 조회할 수 있으며, 로그인한 경우 본인 선점 좌석을 따로 알려준다. */
    @GetMapping("/seats")
    public SeatStatusResponse getSeats(@PathVariable Long gameId, @AuthenticationPrincipal AuthMember authMember) {
        return seatService.getSeatStatus(gameId, authMember == null ? null : authMember.id());
    }

    @PostMapping("/holds")
    public HoldResponse hold(@PathVariable Long gameId, @AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody HoldRequest request) {
        return seatService.hold(gameId, authMember.id(), request.seats());
    }

    @DeleteMapping("/holds")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void release(@PathVariable Long gameId, @AuthenticationPrincipal AuthMember authMember) {
        seatService.releaseAll(gameId, authMember.id());
    }
}
