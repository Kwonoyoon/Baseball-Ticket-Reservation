package com.ballpark.ticketing.reservation.entry;

/** 입장 QR 검증 결과. ADMITTED일 때만 입장시킨다. */
public enum EntryVerifyResult {
    ADMITTED("입장 확인되었습니다."),
    INVALID_TOKEN("올바른 입장 QR이 아닙니다."),
    EXPIRED_TOKEN("유효 시간이 지난 QR입니다. 화면의 새 QR을 보여 달라고 안내해 주세요."),
    NOT_CONFIRMED("취소되었거나 확정되지 않은 예매입니다."),
    GAME_CANCELED("취소된 경기입니다."),
    NOT_YET_OPEN("아직 입장 시간이 아닙니다."),
    GAME_OVER("이미 끝난 경기입니다.");

    private final String message;

    EntryVerifyResult(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
