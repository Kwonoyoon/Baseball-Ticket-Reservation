package com.ballpark.ticketing.game.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 경기 결과 입력(관리자 전용). 아직 경기 관리 화면이 없어 지금은 API로만 기록한다. */
public record GameResultRequest(
        @NotNull @Min(0) Integer homeScore,
        @NotNull @Min(0) Integer awayScore) {
}
