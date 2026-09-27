package com.ballpark.ticketing.member.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * @param autoLogin 자동 로그인: 브라우저를 닫았다 열어도 로그인을 유지한다. (생략하면 false)
 */
public record LoginRequest(
        @NotBlank(message = "아이디를 입력해 주세요.") String username,
        @NotBlank(message = "비밀번호를 입력해 주세요.") String password,
        Boolean autoLogin) {
}
