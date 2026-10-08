package com.ballpark.ticketing.notification;

public enum NotificationType {

    RESERVATION_CONFIRMED("예매 완료 알림", true),
    RESERVATION_CANCELED("예매 취소 알림", true),
    /** 우천취소 등 경기 자체가 취소되어 예매가 자동으로 취소될 때 보낸다. */
    GAME_CANCELED("경기 취소 알림", true),
    /** 기다리던 경기의 양도글이 올라왔을 때 보낸다. 이메일 본문은 예매 정보용이라 이 알림은 이메일 없이 앱 안에서만 간다. */
    TRANSFER_AVAILABLE("양도 대기 알림", true),
    /** 내 예매를 양도 마켓에 올렸을 때 판매자에게 보낸다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_REGISTERED("양도 거래 알림", true),
    /** 올려 둔 양도글을 판매자가 거두었을 때 보낸다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_CANCELED("양도 취소 알림", true),
    /** 양도 마켓에서 티켓을 샀을 때 구매자에게 보낸다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_BOUGHT("양도 구매 알림", true),
    /** 올려 둔 양도글이 팔렸을 때 판매자에게 보낸다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_SOLD("양도 판매 알림", true),
    /** 양도 대기를 등록했을 때 본인에게 내 순번을 알린다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_WAIT_REGISTERED("양도 대기 등록 알림", true),
    /** 양도 대기를 취소했을 때 본인에게 보낸다. 앱 알림과 이메일이 함께 간다. */
    TRANSFER_WAIT_CANCELED("양도 대기 취소 알림", true),
    /**
     * 앞선 대기자가 빠져서 내 순번이 당겨졌을 때 보낸다. 앱 알림은 모두에게, 이메일은 우선 구매 순서(3번째)
     * 안으로 들어온 사람에게만 간다.
     */
    TRANSFER_WAIT_POSITION("대기 순번 변경 알림", true),
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

    /** 설정 화면에서 이 설정이 어떤 알림들을 묶어서 켜고 끄는지 알려 주는 설명. 묶지 않은 종류는 null이다. */
    public String getDescription() {
        return switch (this) {
            case TRANSFER_REGISTERED -> "양도 등록, 취소, 구매, 판매";
            case TRANSFER_AVAILABLE -> "양도글 등록, 대기 등록, 대기 취소, 순번 변경";
            default -> null;
        };
    }

    /**
     * 수신 설정을 어느 종류의 설정으로 저장·판단하는지. 양도 알림은 종류가 많아 설정 화면에서는 둘로 묶어 보여 준다.
     * <ul>
     *   <li>양도 거래(등록·취소·구매·판매): {@link #TRANSFER_REGISTERED}의 설정을 함께 쓴다.</li>
     *   <li>양도 대기(올라옴·대기 등록·대기 취소·순번 변경): {@link #TRANSFER_AVAILABLE}의 설정을 함께 쓴다.
     *       예전부터 이 종류의 설정을 저장해 둔 회원은 그 값이 그대로 이어진다.</li>
     * </ul>
     * 알림 자체의 종류(목록 구분)는 그대로 두고, 설정만 묶는다.
     */
    public NotificationType settingType() {
        return switch (this) {
            case TRANSFER_CANCELED, TRANSFER_BOUGHT, TRANSFER_SOLD -> TRANSFER_REGISTERED;
            case TRANSFER_WAIT_REGISTERED, TRANSFER_WAIT_CANCELED, TRANSFER_WAIT_POSITION -> TRANSFER_AVAILABLE;
            default -> this;
        };
    }
}
