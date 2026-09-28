package com.ballpark.ticketing.global.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authorization 헤더의 Bearer 토큰과 계정 상태를 검증해 SecurityContext에 인증 정보를 채운다.
 * 토큰이 없거나 유효하지 않으면 익명 요청으로 통과시키고, 접근 제어는 SecurityFilterChain이 담당한다.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    /** EventSource는 커스텀 헤더를 보낼 수 없어, 이 경로만 예외적으로 쿼리 파라미터 토큰을 허용한다. */
    private static final String SSE_STREAM_PATH = "/api/notifications/stream";

    private final AccessTokenAuthenticator authenticator;

    public JwtAuthenticationFilter(AccessTokenAuthenticator authenticator) {
        this.authenticator = authenticator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // 토큰 위치는 알림 스트림 때문에 두 곳(헤더·쿼리)이지만, 검증은 언제나 계정 상태까지 본다.
        // (tokenProvider.parse만 쓰면 잠기거나 탈퇴한 계정도 알림 스트림으로는 인증돼 버린다)
        String token = resolveToken(request);
        if (token != null) {
            authenticator.authenticate(token).ifPresent(member -> {
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(member, null, member.authorities()));
                SecurityContextHolder.setContext(context);
            });
        }
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        if (SSE_STREAM_PATH.equals(request.getRequestURI())) {
            return request.getParameter("token");
        }
        return null;
    }
}
