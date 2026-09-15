package com.ballpark.ticketing.reservation;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.reservation.dto.ReservationRequest;
import com.ballpark.ticketing.reservation.dto.ReservationResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse reserve(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody ReservationRequest request) {
        return reservationService.reserve(authMember.id(), request);
    }

    @GetMapping("/me")
    public List<ReservationResponse> getMyReservations(@AuthenticationPrincipal AuthMember authMember) {
        return reservationService.getMyReservations(authMember.id());
    }

    @GetMapping("/{reservationId}")
    public ReservationResponse getReservation(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable Long reservationId) {
        return reservationService.getReservation(authMember.id(), reservationId);
    }

    @PostMapping("/{reservationId}/cancel")
    public ReservationResponse cancel(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable Long reservationId) {
        return reservationService.cancel(authMember.id(), reservationId);
    }
}
