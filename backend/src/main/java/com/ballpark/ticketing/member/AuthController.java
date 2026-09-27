package com.ballpark.ticketing.member;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.member.dto.FavoriteTeamRequest;
import com.ballpark.ticketing.member.dto.LoginRequest;
import com.ballpark.ticketing.member.dto.LoginResponse;
import com.ballpark.ticketing.member.dto.MemberResponse;
import com.ballpark.ticketing.member.dto.SignupRequest;

import jakarta.validation.Valid;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/api/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/api/members/me")
    public MemberResponse me(@AuthenticationPrincipal AuthMember authMember) {
        return authService.getMember(authMember.id());
    }

    @PatchMapping("/api/members/me/favorite-team")
    public MemberResponse updateFavoriteTeam(@AuthenticationPrincipal AuthMember authMember,
            @RequestBody FavoriteTeamRequest request) {
        return authService.updateFavoriteTeam(authMember.id(), request);
    }
}
