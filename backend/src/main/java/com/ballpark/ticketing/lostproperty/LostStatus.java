package com.ballpark.ticketing.lostproperty;

public enum LostStatus {
    /** 분실·습득 접수 완료 */
    REPORTED,
    /** 안내소·보관소에서 보관 중 */
    KEEPING,
    /** 주인이 수령 완료 */
    CLAIMED,
    /** 보관 기간이 지나 폐기 */
    DISCARDED
}
