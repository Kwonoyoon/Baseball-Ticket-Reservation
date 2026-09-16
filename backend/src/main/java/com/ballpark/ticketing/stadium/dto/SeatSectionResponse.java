package com.ballpark.ticketing.stadium.dto;

import java.io.Serializable;

import com.ballpark.ticketing.stadium.SeatGrade;
import com.ballpark.ticketing.stadium.SeatSection;

/**
 * @param code 좌석 배치도의 블록 코드 (예: NAVY-05). 배치도가 없는 구장은 null.
 */
public record SeatSectionResponse(
        Long id,
        String code,
        String name,
        SeatGrade grade,
        String gradeLabel,
        int price,
        int seatRows,
        int seatsPerRow) implements Serializable {

    public static SeatSectionResponse from(SeatSection section) {
        return new SeatSectionResponse(section.getId(), section.getZoneCode(), section.getName(), section.getGrade(),
                section.getGrade().getLabel(), section.getPrice(), section.getSeatRows(), section.getSeatsPerRow());
    }
}
