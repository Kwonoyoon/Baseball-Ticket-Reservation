package com.ballpark.ticketing.lostproperty.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 분실물 등록 요청. imageUrl은 http(s) 주소만 받는다. (화면이 이 주소를 그대로 img 로 그리므로 javascript: 같은 값을 막는다)
 */
public record LostPropertyRequest(
        @NotBlank(message = "제목은 필수 입력 항목입니다.")
        @Size(max = 100, message = "제목은 100자 이하로 입력해 주세요.")
        String title,

        @NotBlank(message = "상세 설명은 필수 입력 항목입니다.")
        @Size(max = 4000, message = "상세 설명은 4000자 이하로 입력해 주세요.")
        String description,

        @NotBlank(message = "구장 이름은 필수 선택 항목입니다.")
        @Size(max = 255, message = "구장 이름이 너무 깁니다.")
        String stadiumName,

        @Size(max = 255, message = "세부 위치는 255자 이하로 입력해 주세요.")
        String specificLocation,

        @NotBlank(message = "카테고리는 필수 선택 항목입니다.")
        @Size(max = 50, message = "카테고리가 너무 깁니다.")
        String category,

        @Size(max = 500, message = "이미지 주소가 너무 깁니다.")
        @Pattern(regexp = "^$|^https?://.+", message = "이미지 주소는 http:// 또는 https:// 로 시작해야 합니다.")
        String imageUrl,

        LocalDateTime lostOrFoundDate) {
}
