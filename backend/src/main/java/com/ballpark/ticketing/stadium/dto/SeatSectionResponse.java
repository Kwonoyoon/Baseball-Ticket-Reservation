package com.ballpark.ticketing.stadium.dto;

import java.io.Serializable;

import com.ballpark.ticketing.stadium.SeatGrade;
import com.ballpark.ticketing.stadium.SeatSection;

public record SeatSectionResponse(
        Long id,
        String name,
        SeatGrade grade,
        String gradeLabel,
        int price,
        int seatRows,
        int seatsPerRow) implements Serializable {

    public static SeatSectionResponse from(SeatSection section) {
        return new SeatSectionResponse(section.getId(), section.getName(), section.getGrade(),
                section.getGrade().getLabel(), section.getPrice(), section.getSeatRows(), section.getSeatsPerRow());
    }
}
