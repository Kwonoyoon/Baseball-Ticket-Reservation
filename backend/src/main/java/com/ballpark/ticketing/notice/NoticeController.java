package com.ballpark.ticketing.notice;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.notice.dto.NoticeRequest;
import com.ballpark.ticketing.notice.dto.NoticeResponse;

import jakarta.validation.Valid;

/**
 * 읽기(GET /api/notices)는 비회원도 된다. 쓰기는 /api/admin/** 아래에 두어 SecurityConfig가 관리자만 통과시킨다.
 */
@RestController
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping("/api/notices")
    public List<NoticeResponse> list(@RequestParam(required = false) NoticeScope scope,
            @RequestParam(required = false) Integer size) {
        return noticeService.list(scope, size);
    }

    @PostMapping("/api/admin/notices")
    @ResponseStatus(HttpStatus.CREATED)
    public NoticeResponse create(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody NoticeRequest request) {
        return noticeService.create(authMember.id(), request);
    }

    @PutMapping("/api/admin/notices/{noticeId}")
    public NoticeResponse update(@PathVariable Long noticeId, @Valid @RequestBody NoticeRequest request) {
        return noticeService.update(noticeId, request);
    }

    @DeleteMapping("/api/admin/notices/{noticeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long noticeId) {
        noticeService.delete(noticeId);
    }
}
