package com.ballpark.ticketing.member;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.ballpark.ticketing.global.security.AuthProperties;
import com.ballpark.ticketing.member.RefreshTokenService.IssuedRefreshToken;

import jakarta.servlet.http.HttpServletResponse;

/**
 * 리프레시 토큰 쿠키. 자바스크립트에서 읽을 수 없고(HttpOnly), 같은 사이트 요청에만 실리며(SameSite=Strict),
 * 토큰 갱신·로그아웃 API로만 전송된다(Path=/api/auth).
 * 자동 로그인이면 유효 기간만큼 유지하고, 아니면 브라우저를 닫을 때 사라지는 세션 쿠키로 둔다.
 */
@Component
public class RefreshTokenCookie {

    public static final String NAME = "ballpark_refresh";
    private static final String PATH = "/api/auth";

    private final AuthProperties properties;

    public RefreshTokenCookie(AuthProperties properties) {
        this.properties = properties;
    }

    public void write(HttpServletResponse response, IssuedRefreshToken token) {
        Duration maxAge = token.persistent() ? properties.refreshTokenValidity() : Duration.ofSeconds(-1);
        response.addHeader(HttpHeaders.SET_COOKIE, base(token.value()).maxAge(maxAge).build().toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, base("").maxAge(Duration.ZERO).build().toString());
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(PATH);
    }
}
