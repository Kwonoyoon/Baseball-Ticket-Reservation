package com.ballpark.ticketing.reservation.entry;

import java.time.LocalDateTime;

import com.ballpark.ticketing.reservation.dto.ReservationResponse;

/**
 * 입장 QR 검증 결과. 서명이 맞으면 어떤 예매인지도 함께 돌려줘 게이트에서 좌석을 안내할 수 있게 한다.
 *
 * @param admitted     입장시켜도 되는지
 * @param reservation  서명이 맞고 예매를 찾았을 때만 값이 있다.
 * @param entryOpensAt 입장 시작 시각. 예매를 찾았을 때만 값이 있다.
 */
public record EntryVerifyResponse(
        boolean admitted,
        EntryVerifyResult result,
        String message,
        ReservationResponse reservation,
        LocalDateTime entryOpensAt) {

    static EntryVerifyResponse rejected(EntryVerifyResult result) {
        return new EntryVerifyResponse(false, result, result.getMessage(), null, null);
    }

    static EntryVerifyResponse of(EntryVerifyResult result, ReservationResponse reservation,
            LocalDateTime entryOpensAt) {
        return new EntryVerifyResponse(result == EntryVerifyResult.ADMITTED, result, result.getMessage(),
                reservation, entryOpensAt);
    }
}
