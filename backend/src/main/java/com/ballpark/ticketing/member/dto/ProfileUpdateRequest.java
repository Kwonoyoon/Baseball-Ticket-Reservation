package com.ballpark.ticketing.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 프로필 수정. 이름·이메일은 가입할 때와 같은 규칙이고, 바꿀 때 현재 비밀번호를 한 번 더 확인한다. */
public record ProfileUpdateRequest(
        @NotBlank(message = "이름을 입력해 주세요.")
        @Size(max = 50, message = "이름은 50자 이하로 입력해 주세요.")
        String name,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @Size(max = 255, message = "이메일이 너무 깁니다.")
        String email,

        @NotBlank(message = "현재 비밀번호를 입력해 주세요.")
        String currentPassword) {
}
