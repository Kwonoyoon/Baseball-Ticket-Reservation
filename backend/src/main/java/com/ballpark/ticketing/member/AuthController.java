package com.ballpark.ticketing.member;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.member.AuthService.AuthResult;
import com.ballpark.ticketing.member.dto.FavoriteTeamRequest;
import com.ballpark.ticketing.member.dto.LoginRequest;
import com.ballpark.ticketing.member.dto.LoginResponse;
import com.ballpark.ticketing.member.dto.MemberResponse;
import com.ballpark.ticketing.member.dto.SignupRequest;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookie refreshTokenCookie;

    public AuthController(AuthService authService, RefreshTokenCookie refreshTokenCookie) {
        this.authService = authService;
        this.refreshTokenCookie = refreshTokenCookie;
    }

    @PostMapping("/api/auth/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    /** 액세스 토큰은 응답 본문으로, 리프레시 토큰은 HttpOnly 쿠키로 내려준다. */
    @PostMapping("/api/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return withCookie(authService.login(request), response);
    }

    /**
     * 실패해도 쿠키를 지우지 않는다. 여러 탭이 동시에 갱신하면 늦게 온 요청이 실패하는데,
     * 이때 쿠키를 지우면 먼저 성공한 요청이 받아 둔 새 토큰까지 사라진다.
     */
    @PostMapping("/api/auth/refresh")
    public LoginResponse refresh(@CookieValue(name = RefreshTokenCookie.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        return withCookie(authService.refresh(refreshToken), response);
    }

    @PostMapping("/api/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name = RefreshTokenCookie.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        authService.logout(refreshToken);
        refreshTokenCookie.clear(response);
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

    private LoginResponse withCookie(AuthResult result, HttpServletResponse response) {
        refreshTokenCookie.write(response, result.refreshToken());
        return result.body();
    }
}
