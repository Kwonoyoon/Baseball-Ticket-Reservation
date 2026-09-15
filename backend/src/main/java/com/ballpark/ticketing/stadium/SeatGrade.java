package com.ballpark.ticketing.stadium;

public enum SeatGrade {

    PREMIUM("프리미엄석"),
    TABLE("테이블석"),
    INFIELD("내야석"),
    OUTFIELD("외야석");

    private final String label;

    SeatGrade(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
