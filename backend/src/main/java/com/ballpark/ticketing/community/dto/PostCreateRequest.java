package com.ballpark.ticketing.community.dto;

import com.ballpark.ticketing.community.PostCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** category를 비워 보내면 자유(FREE)로 둔다. (분류가 생기기 전 화면과 호환) */
public record PostCreateRequest(
        PostCategory category,
        @NotBlank(message = "제목을 입력해 주세요.")
        @Size(max = 100, message = "제목은 100자 이하로 입력해 주세요.")
        String title,

        @NotBlank(message = "내용을 입력해 주세요.")
        @Size(max = 4000, message = "내용은 4000자 이하로 입력해 주세요.")
        String content) {

    public PostCategory categoryOrDefault() {
        return category == null ? PostCategory.FREE : category;
    }
}
