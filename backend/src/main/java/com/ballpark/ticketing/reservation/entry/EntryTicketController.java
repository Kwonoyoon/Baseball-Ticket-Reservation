package com.ballpark.ticketing.reservation.entry;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;

import jakarta.validation.Valid;

@RestController
public class EntryTicketController {

    private final EntryTicketService entryTicketService;

    public EntryTicketController(EntryTicketService entryTicketService) {
        this.entryTicketService = entryTicketService;
    }

    /** 내 티켓 화면이 QR을 그릴 때마다(30초마다) 새 입장 QR 값을 받는다. */
    @PostMapping("/api/reservations/{reservationId}/entry-ticket")
    public ResponseEntity<EntryTicketResponse> issue(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable Long reservationId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(entryTicketService.issue(authMember.id(), reservationId));
    }

    /** 입장 게이트(관리자)가 읽은 QR 값을 검증한다. 결과는 언제나 200으로 주고 admitted로 입장 여부를 알린다. */
    @PostMapping("/api/admin/entry/verify")
    public EntryVerifyResponse verify(@Valid @RequestBody EntryVerifyRequest request) {
        return entryTicketService.verify(request.token());
    }
}
