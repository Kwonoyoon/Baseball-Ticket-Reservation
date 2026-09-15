package com.ballpark.ticketing.seat;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 경기장 안의 좌석 한 자리. API와 Redis 키에서는 {@code "구역ID-열-번호"} 문자열로 표현한다.
 */
public record SeatPosition(
        @NotNull(message = "구역 정보가 필요합니다.") Long sectionId,
        @Positive(message = "열 번호가 올바르지 않습니다.") int rowNo,
        @Positive(message = "좌석 번호가 올바르지 않습니다.") int seatNo) {

    public String key() {
        return sectionId + "-" + rowNo + "-" + seatNo;
    }

    public static SeatPosition fromKey(String key) {
        String[] parts = key.split("-");
        if (parts.length != 3) {
            throw new IllegalArgumentException("잘못된 좌석 키: " + key);
        }
        return new SeatPosition(Long.valueOf(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
    }
}
