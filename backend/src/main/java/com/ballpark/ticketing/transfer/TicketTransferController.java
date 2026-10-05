package com.ballpark.ticketing.transfer;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.transfer.dto.TransferBuyRequest;
import com.ballpark.ticketing.transfer.dto.TransferResponse;

import jakarta.validation.Valid;

@RestController
public class TicketTransferController {

    private final TicketTransferService transferService;

    public TicketTransferController(TicketTransferService transferService) {
        this.transferService = transferService;
    }

    @GetMapping("/api/transfers")
    public List<TransferResponse> listOpen(@AuthenticationPrincipal AuthMember authMember,
            @RequestParam(required = false) Long teamId) {
        return transferService.listOpen(authMember.id(), teamId);
    }

    @GetMapping("/api/transfers/me")
    public List<TransferResponse> listMine(@AuthenticationPrincipal AuthMember authMember) {
        return transferService.listMine(authMember.id());
    }

    @PostMapping("/api/reservations/{reservationId}/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse register(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable Long reservationId) {
        return transferService.register(authMember.id(), reservationId);
    }

    @PostMapping("/api/transfers/{transferId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long transferId) {
        transferService.cancel(authMember.id(), transferId);
    }

    @PostMapping("/api/transfers/{transferId}/buy")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void buy(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long transferId,
            @Valid @RequestBody TransferBuyRequest request) {
        transferService.buy(authMember.id(), transferId, request.paymentMethod());
    }
}
