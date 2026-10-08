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
import com.ballpark.ticketing.reservation.dto.PaymentAbandonRequest;
import com.ballpark.ticketing.reservation.dto.PaymentAbandonResponse;
import com.ballpark.ticketing.reservation.dto.PaymentConfirmRequest;
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

    /** 결제 대기 예매를 만든다. 돌려준 예매번호(주문번호)·금액으로 결제창을 연다. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse reserve(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody ReservationRequest request) {
        return reservationService.reserve(authMember.id(), request);
    }

    /** 결제창에서 인증을 마친 결제를 승인하고 예매를 확정한다. */
    @PostMapping("/confirm")
    public ReservationResponse confirmPayment(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody PaymentConfirmRequest request) {
        return reservationService.confirmPayment(authMember.id(), request);
    }

    /** 결제창에서 결제를 그만두거나 실패했을 때 결제 대기 예매를 지우고 좌석을 푼다. */
    @PostMapping("/abandon")
    public PaymentAbandonResponse abandonPayment(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody PaymentAbandonRequest request) {
        return reservationService.abandonPayment(authMember.id(), request.orderId());
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
