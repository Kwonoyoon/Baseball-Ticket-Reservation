package com.ballpark.ticketing.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.ballpark.ticketing.notification.dto.NotificationResponse;

/** 서버가 한 대일 때: 이 서버에 연결된 회원에게만 보낸다. */
@Component
@ConditionalOnProperty(prefix = "ticketing.notification", name = "broadcast", havingValue = "local")
public class LocalNotificationBroadcaster implements NotificationBroadcaster {

    private final NotificationEmitterRegistry emitterRegistry;

    public LocalNotificationBroadcaster(NotificationEmitterRegistry emitterRegistry) {
        this.emitterRegistry = emitterRegistry;
    }

    @Override
    public void broadcast(Long memberId, NotificationResponse notification) {
        emitterRegistry.send(memberId, notification);
    }
}
