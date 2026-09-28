package com.ballpark.ticketing.global.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.MemberRole;

import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AccessTokenAuthenticator authenticator) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // H2 콘솔(local 프로필)이 iframe을 사용한다.
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .authorizeHttpRequests(auth -> auth
                        // 알림 스트림(SSE)이 끝나거나 끊기면 서블릿이 같은 요청을 ASYNC로 한 번 더 태운다.
                        // 이때는 토큰 필터가 다시 돌지 않아 익명으로 보이고, 이미 보낸 응답이라 거절도 못 해
                        // 'Access Denied' 오류 로그만 쌓인다. 처음 요청에서 이미 인가됐으므로 통과시킨다.
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        // 비회원(로그인 전)도 쓸 수 있는 API: 가입·로그인·토큰 갱신, 경기 일정과 좌석 현황 조회
                        .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login", "/api/auth/refresh",
                                "/api/auth/logout")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/teams", "/api/games", "/api/games/*",
                                "/api/games/*/seats", "/api/games/*/seats/summary")
                        .permitAll()
                        .requestMatchers("/actuator/health", "/h2-console/**", "/error").permitAll()
                        // 관리자
                        .requestMatchers("/api/admin/**").hasRole(MemberRole.ADMIN.name())
                        // 그 밖의 API는 회원(관리자 포함)
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, e) ->
                                JsonErrorWriter.write(response, ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, e) ->
                                JsonErrorWriter.write(response, ErrorCode.FORBIDDEN)))
                .addFilterBefore(new JwtAuthenticationFilter(authenticator), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /**
     * 인증은 JWT 필터와 AuthService가 담당한다. 이 빈을 등록해 Spring Boot가 기본 사용자와 임시 비밀번호를 만들지 않게 한다.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException(username);
        };
    }
}
