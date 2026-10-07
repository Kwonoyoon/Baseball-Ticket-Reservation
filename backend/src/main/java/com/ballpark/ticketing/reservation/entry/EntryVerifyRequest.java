package com.ballpark.ticketing.reservation.entry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param token 입장 QR을 읽은 값 */
public record EntryVerifyRequest(@NotBlank @Size(max = 2000) String token) {
}
