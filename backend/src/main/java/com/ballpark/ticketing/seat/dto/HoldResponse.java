package com.ballpark.ticketing.seat.dto;

import java.time.Instant;
import java.util.List;

public record HoldResponse(List<String> seats, Instant expiresAt) {
}
