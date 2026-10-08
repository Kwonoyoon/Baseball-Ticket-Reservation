package com.ballpark.ticketing.community;

/** 신고 처리 상태 */
public enum ReportStatus {
    /** 처리전 */
    PENDING,
    /** 신고 대상(글·댓글)을 지웠다. 작성자가 스스로 지운 경우도 포함한다. */
    DELETED,
    /** 반려: 지울 만한 내용이 아니라고 판단했다. */
    REJECTED
}
