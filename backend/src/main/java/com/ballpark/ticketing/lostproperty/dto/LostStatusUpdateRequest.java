package com.ballpark.ticketing.lostproperty.dto;

import com.ballpark.ticketing.lostproperty.LostStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 관리자가 상태와 보관 장소를 바꾼다. storageLocation을 비워 보내면 이전 보관 장소를 유지한다. */
public record LostStatusUpdateRequest(
        @NotNull(message = "변경할 상태 값은 필수입니다.") LostStatus status,
        @Size(max = 255, message = "보관 장소는 255자 이하로 입력해 주세요.") String storageLocation) {
}
