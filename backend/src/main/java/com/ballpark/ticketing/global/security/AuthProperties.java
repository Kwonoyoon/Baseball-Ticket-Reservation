package com.ballpark.ticketing.global.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param refreshTokenValidity 리프레시 토큰(로그인 유지) 유효 기간
 * @param refreshReuseGrace    이미 교체된 리프레시 토큰이 이 시간 안에 다시 오면 탈취가 아니라 동시 요청(여러 탭)으로 본다
 * @param cookieSecure         리프레시 토큰 쿠키에 Secure를 붙일지 (HTTPS 운영 환경에서는 반드시 true)
 * @param maxLoginFailures     비밀번호를 이 횟수만큼 연속으로 틀리면 계정을 잠근다
 */
@ConfigurationProperties(prefix = "ticketing.auth")
public record AuthProperties(Duration refreshTokenValidity, Duration refreshReuseGrace, boolean cookieSecure,
        int maxLoginFailures) {
}
