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

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtTokenProvider tokenProvider) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // H2 콘솔(local 프로필)이 iframe을 사용한다.
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/teams", "/api/games", "/api/games/*",
                                "/api/games/*/seats", "/api/games/*/seats/summary")
                        .permitAll()
                        .requestMatchers("/actuator/health", "/h2-console/**", "/error").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/games/*/result").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, e) ->
                                JsonErrorWriter.write(response, ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, e) ->
                                JsonErrorWriter.write(response, ErrorCode.FORBIDDEN)))
                .addFilterBefore(new JwtAuthenticationFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);
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
