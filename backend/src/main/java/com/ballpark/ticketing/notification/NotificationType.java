package com.ballpark.ticketing.notification;

public enum NotificationType {

    RESERVATION_CONFIRMED("예매 완료 알림", true),
    RESERVATION_CANCELED("예매 취소 알림", true),
    /** 우천취소 등 경기 자체가 취소되어 예매가 자동으로 취소될 때 보낸다. */
    GAME_CANCELED("경기 취소 알림", true),
    /** 기다리던 경기의 양도글이 올라왔을 때 보낸다. 이메일 본문은 예매 정보용이라 이 알림은 이메일 없이 앱 안에서만 간다. */
    TRANSFER_AVAILABLE("양도 대기 알림", true),
    /** 운영자가 보내는 공지성 알림. 회원이 끌 수 없다. */
    GENERAL("공지 알림", false);

    private final String label;
    private final boolean controllable;

    NotificationType(String label, boolean controllable) {
        this.label = label;
        this.controllable = controllable;
    }

    public String getLabel() {
        return label;
    }

    /** 알림 설정 화면에서 회원이 수신 여부를 켜고 끌 수 있는 종류인지 여부 */
    public boolean isControllable() {
        return controllable;
    }
}
