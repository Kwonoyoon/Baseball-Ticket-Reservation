package com.ballpark.ticketing.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @NotBlank(message = "신고 사유를 입력해 주세요.")
        @Size(max = 500, message = "신고 사유는 500자 이하로 입력해 주세요.")
        String reason) {
}
