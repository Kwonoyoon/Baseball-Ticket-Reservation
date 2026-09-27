package com.ballpark.ticketing.notification;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.notification.dto.NotificationPreferenceResponse;
import com.ballpark.ticketing.notification.dto.NotificationResponse;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private static final int LIST_LIMIT = 50;

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationEmitterRegistry emitterRegistry;
    private final Clock clock;

    public NotificationService(NotificationRepository notificationRepository,
            NotificationPreferenceRepository preferenceRepository, NotificationEmitterRegistry emitterRegistry,
            Clock clock) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.emitterRegistry = emitterRegistry;
        this.clock = clock;
    }

    /** 회원이 이 종류의 알림을 꺼두었다면 알림을 만들지도, 보내지도 않는다. */
    @Transactional
    public void create(Long memberId, NotificationType type, String title, String message) {
        if (!isEnabled(memberId, type)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(clock);
        Notification notification = notificationRepository.save(new Notification(memberId, type, title, message, now));
        emitterRegistry.send(memberId, NotificationResponse.from(notification));
    }

    public List<NotificationPreferenceResponse> getPreferences(Long memberId) {
        Map<NotificationType, Boolean> saved = preferenceRepository.findAllByMemberId(memberId).stream()
                .collect(Collectors.toMap(NotificationPreference::getType, NotificationPreference::isEnabled));
        return Arrays.stream(NotificationType.values())
                .filter(NotificationType::isControllable)
                .map(type -> new NotificationPreferenceResponse(type, type.getLabel(), saved.getOrDefault(type, true)))
                .toList();
    }

    @Transactional
    public void updatePreference(Long memberId, NotificationType type, boolean enabled) {
        if (!type.isControllable()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "설정할 수 없는 알림 유형입니다.");
        }
        preferenceRepository.findByMemberIdAndType(memberId, type)
                .ifPresentOrElse(
                        preference -> preference.updateEnabled(enabled),
                        () -> preferenceRepository.save(new NotificationPreference(memberId, type, enabled)));
    }

    private boolean isEnabled(Long memberId, NotificationType type) {
        if (!type.isControllable()) {
            return true;
        }
        return preferenceRepository.findByMemberIdAndType(memberId, type)
                .map(NotificationPreference::isEnabled)
                .orElse(true);
    }

    public List<NotificationResponse> getNotifications(Long memberId) {
        return notificationRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId, Limit.of(LIST_LIMIT)).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    public long getUnreadCount(Long memberId) {
        return notificationRepository.countByMemberIdAndReadFalse(memberId);
    }

    @Transactional
    public void markAsRead(Long memberId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .filter(n -> n.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markAsRead();
    }

    @Transactional
    public void markAllAsRead(Long memberId) {
        notificationRepository.findAllByMemberIdAndReadFalse(memberId).forEach(Notification::markAsRead);
    }

    @Transactional
    public void deleteAll(Long memberId) {
        notificationRepository.deleteAllByMemberId(memberId);
    }

    public SseEmitter subscribe(Long memberId) {
        return emitterRegistry.register(memberId);
    }
}
