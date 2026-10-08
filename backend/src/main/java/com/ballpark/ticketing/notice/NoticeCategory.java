package com.ballpark.ticketing.notice;

/** 공지 종류. 서비스 운영 안내만 다룬다. (구단 소식이나 잡담은 커뮤니티 글로 쓴다) */
public enum NoticeCategory {
    /** 시스템 업데이트 */
    UPDATE,
    EVENT,
    /** 점검 */
    MAINTENANCE
}
