package com.ballpark.ticketing.lostproperty;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.lostproperty.dto.LostPropertyRequest;
import com.ballpark.ticketing.lostproperty.dto.LostPropertyResponse;
import com.ballpark.ticketing.lostproperty.dto.LostStatusUpdateRequest;

import jakarta.validation.Valid;

/**
 * 분실물센터 API. 모두 로그인한 회원이 쓴다. 상태 변경은 /api/admin/** 아래라 관리자만 된다.
 * (팀원 버전은 /api/v1/lost-properties 였는데, 이 프로젝트의 다른 API와 같이 /api/ 아래로 맞췄다)
 */
@RestController
public class LostPropertyController {

    private final LostPropertyService lostPropertyService;

    public LostPropertyController(LostPropertyService lostPropertyService) {
        this.lostPropertyService = lostPropertyService;
    }

    @PostMapping("/api/lost-properties")
    @ResponseStatus(HttpStatus.CREATED)
    public LostPropertyResponse create(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody LostPropertyRequest request) {
        return lostPropertyService.create(authMember.id(), request);
    }

    @GetMapping("/api/lost-properties")
    public List<LostPropertyResponse> list(@AuthenticationPrincipal AuthMember authMember,
            @RequestParam(required = false) String stadiumName, @RequestParam(required = false) LostStatus status) {
        return lostPropertyService.list(authMember.id(), stadiumName, status);
    }

    /** {id}보다 구체적인 주소라 이쪽이 먼저 걸린다. */
    @GetMapping("/api/lost-properties/stadiums")
    public List<String> stadiums() {
        return lostPropertyService.stadiumNames();
    }

    @GetMapping("/api/lost-properties/{id}")
    public LostPropertyResponse get(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long id) {
        return lostPropertyService.get(authMember.id(), id);
    }

    /** 올린 본인이나 관리자가 지운다. 일반 회원이 남의 글을 지우려 하면 403이다. */
    @DeleteMapping("/api/lost-properties/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long id) {
        lostPropertyService.delete(authMember.id(), authMember.isAdmin(), id);
    }

    @PatchMapping("/api/admin/lost-properties/{id}/status")
    public LostPropertyResponse updateStatus(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long id,
            @Valid @RequestBody LostStatusUpdateRequest request) {
        return lostPropertyService.updateStatus(authMember.id(), id, request);
    }
}
