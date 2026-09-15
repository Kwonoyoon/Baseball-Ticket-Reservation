package com.ballpark.ticketing.seat.dto;

import java.util.List;

import com.ballpark.ticketing.seat.SeatPosition;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

public record HoldRequest(@NotEmpty(message = "좌석을 선택해 주세요.") List<@Valid SeatPosition> seats) {
}
