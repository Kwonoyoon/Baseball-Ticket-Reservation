package com.ballpark.ticketing.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import com.ballpark.ticketing.notification.dto.NotificationResponse;

import tools.jackson.databind.json.JsonMapper;

/**
 * 서버가 여러 대일 때: 알림을 Redis 채널로 뿌리고, 모든 서버가 받아서 자기에게 연결된 회원에게 전달한다.
 * 알림을 만든 서버도 똑같이 채널을 통해 받으므로 한 번만 전달된다.
 * 구독 컨테이너(RedisMessageListenerContainer)는 Spring Boot가 만들어 주는 것을 쓴다.
 */
@Component
@ConditionalOnProperty(prefix = "ticketing.notification", name = "broadcast", havingValue = "redis",
        matchIfMissing = true)
public class RedisNotificationBroadcaster implements NotificationBroadcaster, MessageListener {

    static final String CHANNEL = "ticketing:notifications";

    private static final Logger log = LoggerFactory.getLogger(RedisNotificationBroadcaster.class);

    private final StringRedisTemplate redisTemplate;
    private final JsonMapper jsonMapper;
    private final NotificationEmitterRegistry emitterRegistry;

    public RedisNotificationBroadcaster(StringRedisTemplate redisTemplate, JsonMapper jsonMapper,
            NotificationEmitterRegistry emitterRegistry, RedisMessageListenerContainer listenerContainer) {
        this.redisTemplate = redisTemplate;
        this.jsonMapper = jsonMapper;
        this.emitterRegistry = emitterRegistry;
        listenerContainer.addMessageListener(this, new ChannelTopic(CHANNEL));
    }

    @Override
    public void broadcast(Long memberId, NotificationResponse notification) {
        redisTemplate.convertAndSend(CHANNEL, jsonMapper.writeValueAsString(new Envelope(memberId, notification)));
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            Envelope envelope = jsonMapper.readValue(message.getBody(), Envelope.class);
            emitterRegistry.send(envelope.memberId(), envelope.notification());
        } catch (RuntimeException e) {
            // 한 건을 못 읽어도 구독은 계속 살아 있어야 한다. 알림은 DB에 있어 다음 연결 때 목록으로 보인다.
            log.warn("알림 채널 메시지를 처리하지 못했습니다.", e);
        }
    }

    /** 채널로 오가는 메시지. 누구에게 보낼지와 알림 내용. */
    record Envelope(Long memberId, NotificationResponse notification) {
    }
}
