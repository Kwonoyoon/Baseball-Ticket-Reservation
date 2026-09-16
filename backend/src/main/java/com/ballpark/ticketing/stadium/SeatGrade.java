package com.ballpark.ticketing.stadium;

public enum SeatGrade {

    PREMIUM("프리미엄석"),
    EXCITING("익사이팅존"),
    TABLE("테이블석"),
    BLUE("블루석"),
    ORANGE("오렌지석"),
    RED("레드석"),
    NAVY("네이비석"),
    /** 블록으로 나누기 전 기본 템플릿 구장에서 사용한다. */
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
