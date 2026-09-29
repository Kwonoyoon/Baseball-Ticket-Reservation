package com.ballpark.ticketing.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** 알림 메일에 담을 "예매 내역 보기" 링크를 만들 때 쓰는 프론트엔드 주소. */
@ConfigurationProperties(prefix = "ticketing.notification.mail")
public record NotificationMailProperties(String appBaseUrl) {
}
