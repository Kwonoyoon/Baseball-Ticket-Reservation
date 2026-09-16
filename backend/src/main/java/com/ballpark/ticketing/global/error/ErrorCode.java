package com.ballpark.ticketing.global.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "경기를 찾을 수 없습니다."),
    SECTION_NOT_FOUND(HttpStatus.NOT_FOUND, "구역을 찾을 수 없습니다."),
    RESERVATION_NOT_FOUND(HttpStatus.NOT_FOUND, "예매 내역을 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
    BOOKING_CLOSED(HttpStatus.CONFLICT, "예매가 마감된 경기입니다."),
    INVALID_SEAT(HttpStatus.BAD_REQUEST, "존재하지 않는 좌석이 포함되어 있습니다."),
    SEAT_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "선택할 수 있는 좌석 수를 초과했습니다."),
    SEAT_ALREADY_HELD(HttpStatus.CONFLICT, "다른 고객이 선택 중인 좌석입니다."),
    SEAT_ALREADY_SOLD(HttpStatus.CONFLICT, "이미 판매된 좌석입니다."),
    HOLD_EXPIRED(HttpStatus.CONFLICT, "좌석 선점 시간이 만료되었습니다. 좌석을 다시 선택해 주세요."),
    PAYMENT_FAILED(HttpStatus.PAYMENT_REQUIRED, "결제에 실패했습니다."),
    NOT_CANCELABLE(HttpStatus.CONFLICT, "취소할 수 없는 예매입니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
