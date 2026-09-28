package com.ballpark.ticketing.member;

/**
 * 계정의 권한. 로그인하지 않은 방문자는 비회원으로, 경기 일정과 좌석 현황만 볼 수 있다.
 */
public enum MemberRole {
    /** 회원: 좌석 선점, 예매, 예매 내역 */
    MEMBER,
    /** 관리자: 회원 기능 + 회원 관리(/api/admin/**) */
    ADMIN
}
