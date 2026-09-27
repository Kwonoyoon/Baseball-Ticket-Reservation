package com.ballpark.ticketing.member;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.member.AuthService.AuthResult;
import com.ballpark.ticketing.member.dto.LoginResponse;
import com.ballpark.ticketing.member.dto.PasswordChangeRequest;
import com.ballpark.ticketing.member.dto.WithdrawRequest;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
public class AccountController {

    private final AccountService accountService;
    private final RefreshTokenCookie refreshTokenCookie;

    public AccountController(AccountService accountService, RefreshTokenCookie refreshTokenCookie) {
        this.accountService = accountService;
        this.refreshTokenCookie = refreshTokenCookie;
    }

    /**
     * 다른 기기는 모두 로그아웃되고, 이 브라우저는 새 토큰을 받는다.
     * 리프레시 토큰 쿠키(Path=/api/auth)를 받아야 하므로 /api/auth 아래에 둔다.
     */
    @PutMapping("/api/auth/password")
    public LoginResponse changePassword(@AuthenticationPrincipal AuthMember authMember,
            @Valid @RequestBody PasswordChangeRequest request,
            @CookieValue(name = RefreshTokenCookie.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        AuthResult result = accountService.changePassword(authMember.id(), request, refreshToken);
        refreshTokenCookie.write(response, result.refreshToken());
        return result.body();
    }

    @PostMapping("/api/members/me/withdraw")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal AuthMember authMember, @Valid @RequestBody WithdrawRequest request,
            HttpServletResponse response) {
        accountService.withdraw(authMember.id(), request.password());
        refreshTokenCookie.clear(response);
    }
}
