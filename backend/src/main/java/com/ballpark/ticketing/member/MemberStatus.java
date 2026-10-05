package com.ballpark.ticketing.member;

public enum MemberStatus {
    ACTIVE,
    /** 비밀번호를 연속으로 틀렸거나 관리자가 잠근 계정. 관리자가 해제해야 로그인할 수 있다. */
    LOCKED,
    /** 탈퇴한 계정. 아이디는 재사용되지 않도록 남겨 두고 개인정보는 지운다. */
    WITHDRAWN
}
