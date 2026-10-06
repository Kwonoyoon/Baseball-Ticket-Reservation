package com.ballpark.ticketing.notice.dto;

import com.ballpark.ticketing.notice.NoticeCategory;
import com.ballpark.ticketing.notice.NoticeScope;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NoticeRequest(
        @NotNull(message = "공지가 뜰 자리를 골라 주세요.") NoticeScope scope,
        @NotNull(message = "공지 종류를 골라 주세요.") NoticeCategory category,
        @NotBlank(message = "제목을 입력해 주세요.")
        @Size(max = 100, message = "제목은 100자 이하로 입력해 주세요.")
        String title,
        @NotBlank(message = "내용을 입력해 주세요.")
        @Size(max = 4000, message = "내용은 4000자 이하로 입력해 주세요.")
        String content) {
}
