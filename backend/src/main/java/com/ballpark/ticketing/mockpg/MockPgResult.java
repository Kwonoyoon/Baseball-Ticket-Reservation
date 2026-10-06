package com.ballpark.ticketing.mockpg;

/** 가짜 PG의 처리 결과. 실패하면 PG 쪽 오류 코드와 사용자에게 보여 줄 문구를 담는다. */
public record MockPgResult(boolean success, String paymentKey, String code, String message) {

    static MockPgResult ok(String paymentKey) {
        return new MockPgResult(true, paymentKey, null, null);
    }

    static MockPgResult failed(String code, String message) {
        return new MockPgResult(false, null, code, message);
    }
}
