package com.ballpark.ticketing.mockpg;

/** 결제창 테스트 모드에서 고르는 결과. 실제 PG의 테스트 카드처럼 실패 상황을 일부러 만들어 볼 수 있다. */
public enum MockPgTestOutcome {
    APPROVE("승인"),
    REJECT_LIMIT_EXCEEDED("카드 한도가 초과되었습니다."),
    REJECT_INSUFFICIENT_BALANCE("잔액이 부족합니다."),
    REJECT_CARD_SUSPENDED("사용이 정지된 카드입니다.");

    private final String message;

    MockPgTestOutcome(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
