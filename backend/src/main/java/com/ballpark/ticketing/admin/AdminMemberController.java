package com.ballpark.ticketing.admin;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.admin.dto.AdminMemberResponse;
import com.ballpark.ticketing.admin.dto.RoleChangeRequest;
import com.ballpark.ticketing.global.security.AuthMember;

import jakarta.validation.Valid;

/** 관리자 전용. 접근 제어는 SecurityConfig의 /api/admin/** 규칙이 맡는다. */
@RestController
@RequestMapping("/api/admin/members")
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    public AdminMemberController(AdminMemberService adminMemberService) {
        this.adminMemberService = adminMemberService;
    }

    @GetMapping
    public List<AdminMemberResponse> search(@RequestParam(required = false) String keyword) {
        return adminMemberService.search(keyword);
    }

    @PostMapping("/{memberId}/lock")
    public AdminMemberResponse lock(@AuthenticationPrincipal AuthMember admin, @PathVariable Long memberId) {
        return adminMemberService.lock(admin.id(), memberId);
    }

    @PostMapping("/{memberId}/unlock")
    public AdminMemberResponse unlock(@AuthenticationPrincipal AuthMember admin, @PathVariable Long memberId) {
        return adminMemberService.unlock(admin.id(), memberId);
    }

    /** 회원 삭제(탈퇴 처리). 예매 이력을 남기려고 행은 지우지 않는다. */
    @DeleteMapping("/{memberId}")
    public AdminMemberResponse withdraw(@AuthenticationPrincipal AuthMember admin, @PathVariable Long memberId) {
        return adminMemberService.withdraw(admin.id(), memberId);
    }

    @PutMapping("/{memberId}/role")
    public AdminMemberResponse changeRole(@AuthenticationPrincipal AuthMember admin, @PathVariable Long memberId,
            @Valid @RequestBody RoleChangeRequest request) {
        return adminMemberService.changeRole(admin.id(), memberId, request.role());
    }
}
