package com.ballpark.ticketing.mockpg;

public enum MockPaymentStatus {
    /** 결제창 인증 완료, 가맹점 승인 대기 */
    READY,
    /** 승인 완료 (돈이 빠져나간 상태) */
    DONE,
    /** 환불 완료 */
    CANCELED,
    /** 승인 요청이 제때 오지 않아 무효가 된 결제 (돈은 빠져나가지 않았다) */
    EXPIRED
}
