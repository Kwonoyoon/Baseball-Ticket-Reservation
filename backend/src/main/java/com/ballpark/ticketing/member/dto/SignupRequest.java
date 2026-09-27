package com.ballpark.ticketing.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "아이디를 입력해 주세요.")
        @Pattern(regexp = USERNAME_PATTERN, message = "아이디는 영문으로 시작하는 영문·숫자 4~20자로 입력해 주세요.")
        String username,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @Size(max = 255, message = "이메일이 너무 깁니다.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하로 입력해 주세요.")
        String password,

        @NotBlank(message = "이름을 입력해 주세요.")
        @Size(max = 50, message = "이름은 50자 이하로 입력해 주세요.")
        String name) {

    /** 영문으로 시작하는 영문·숫자 4~20자. 대소문자는 구분하지 않고 소문자로 저장한다. */
    public static final String USERNAME_PATTERN = "^[A-Za-z][A-Za-z0-9]{3,19}$";
}
