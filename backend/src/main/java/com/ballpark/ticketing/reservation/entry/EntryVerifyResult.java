package com.ballpark.ticketing.reservation.entry;

/** 입장 QR 검증 결과. ADMITTED일 때만 입장시킨다. */
public enum EntryVerifyResult {
    ADMITTED("입장 확인되었습니다."),
    INVALID_TOKEN("올바른 입장 QR이 아닙니다."),
    EXPIRED_TOKEN("유효 시간이 지난 QR입니다. 화면의 새 QR을 보여 달라고 안내해 주세요."),
    NOT_CONFIRMED("취소되었거나 확정되지 않은 예매입니다."),
    GAME_CANCELED("취소된 경기입니다."),
    NOT_YET_OPEN("아직 입장 시간이 아닙니다."),
    GAME_OVER("이미 끝난 경기입니다."),
    ALREADY_ENTERED("이미 입장한 예매입니다. 재입장은 할 수 없습니다."),
    /** 양도로 주인이 바뀌기 전에 받아 둔 QR. 지금 주인의 QR만 통과한다. */
    OWNER_CHANGED("양도로 주인이 바뀐 티켓의 이전 QR입니다. 지금 주인의 QR을 보여 달라고 안내해 주세요."),
    /** 양도 마켓에 올라가 있는 티켓. 입장하면 산 사람이 들어올 수 없으므로, 양도를 취소해야 입장할 수 있다. */
    LISTED_FOR_TRANSFER("양도 중인 티켓입니다. 양도를 취소한 뒤 다시 QR을 보여 달라고 안내해 주세요.");

    private final String message;

    EntryVerifyResult(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
