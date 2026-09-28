package com.ballpark.ticketing.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.Topic;

import com.ballpark.ticketing.notification.dto.NotificationResponse;

import tools.jackson.databind.json.JsonMapper;

/** 서버끼리 Redis로 주고받는 알림 메시지가 온전히 되돌아오는지 본다. (통합 테스트는 Redis 없이 local 방식으로 돈다) */
class RedisNotificationBroadcasterTest {

    private final StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    private final RedisMessageListenerContainer container = mock(RedisMessageListenerContainer.class);
    private final NotificationEmitterRegistry registry = mock(NotificationEmitterRegistry.class);
    private final RedisNotificationBroadcaster broadcaster =
            new RedisNotificationBroadcaster(redisTemplate, JsonMapper.builder().build(), registry, container);

    @Test
    void 채널로_보낸_알림을_받은_서버가_같은_회원에게_전달한다() {
        NotificationResponse payload = new NotificationResponse(7L, NotificationType.RESERVATION_CONFIRMED,
                "예매가 완료되었습니다", "BP1 예매가 정상적으로 완료되었습니다.", false, LocalDateTime.of(2026, 9, 28, 12, 0));

        broadcaster.broadcast(3L, payload);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(redisTemplate).convertAndSend(eq(RedisNotificationBroadcaster.CHANNEL), json.capture());

        // 다른 서버(자기 자신 포함)가 채널에서 받은 것처럼 그대로 되돌려 준다.
        broadcaster.onMessage(message(json.getValue()), null);

        verify(registry).send(3L, payload);
        verify(container).addMessageListener(eq(broadcaster), any(Topic.class));
    }

    @Test
    void 읽을_수_없는_메시지는_건너뛰고_구독은_유지한다() {
        broadcaster.onMessage(message("{깨진 메시지"), null);

        verify(registry, never()).send(anyLong(), any());
    }

    private static DefaultMessage message(String body) {
        return new DefaultMessage(RedisNotificationBroadcaster.CHANNEL.getBytes(StandardCharsets.UTF_8),
                body.getBytes(StandardCharsets.UTF_8));
    }
}
