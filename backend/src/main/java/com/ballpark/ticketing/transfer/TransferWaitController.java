package com.ballpark.ticketing.transfer;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.transfer.dto.TransferWaitResponse;

@RestController
public class TransferWaitController {

    private final TransferWaitService waitService;

    public TransferWaitController(TransferWaitService waitService) {
        this.waitService = waitService;
    }

    @PostMapping("/api/games/{gameId}/transfer-waits")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferWaitResponse register(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable Long gameId) {
        return waitService.register(authMember.id(), gameId);
    }

    @GetMapping("/api/transfer-waits/me")
    public List<TransferWaitResponse> listMine(@AuthenticationPrincipal AuthMember authMember) {
        return waitService.listMine(authMember.id());
    }

    @PostMapping("/api/transfer-waits/{waitId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long waitId) {
        waitService.cancel(authMember.id(), waitId);
    }
}
