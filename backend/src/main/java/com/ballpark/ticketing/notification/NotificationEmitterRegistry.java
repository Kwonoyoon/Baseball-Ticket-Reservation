package com.ballpark.ticketing.notification;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ballpark.ticketing.notification.dto.NotificationResponse;

/**
 * 회원별로 열려 있는 SSE 연결을 들고 있다가 알림이 생기면 그 자리에서 밀어준다.
 * 서버 인스턴스가 여러 대가 되면 이 맵은 인스턴스마다 따로 놀기 때문에 Redis Pub/Sub 등으로 바꿔야 한다.
 */
@Component
public class NotificationEmitterRegistry {

    private static final Logger log = LoggerFactory.getLogger(NotificationEmitterRegistry.class);
    private static final long TIMEOUT_MILLIS = 30L * 60 * 1000;
    private static final String EVENT_CONNECTED = "connected";
    private static final String EVENT_NOTIFICATION = "notification";

    private final Map<Long, List<SseEmitter>> emittersByMember = new ConcurrentHashMap<>();

    public SseEmitter register(Long memberId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
        List<SseEmitter> emitters = emittersByMember.computeIfAbsent(memberId, id -> new CopyOnWriteArrayList<>());
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name(EVENT_CONNECTED).data("ok"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void send(Long memberId, NotificationResponse payload) {
        List<SseEmitter> emitters = emittersByMember.get(memberId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(EVENT_NOTIFICATION).data(payload));
            } catch (IOException e) {
                log.debug("연결이 끊긴 SSE emitter를 정리합니다. memberId={}", memberId);
                emitters.remove(emitter);
            }
        }
    }
}
