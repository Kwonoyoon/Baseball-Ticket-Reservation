package com.ballpark.ticketing.notification;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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
    private final NotificationBroadcaster broadcaster;
    private final NotificationEmailSender emailSender;
    private final Clock clock;

    public NotificationService(NotificationRepository notificationRepository,
            NotificationPreferenceRepository preferenceRepository, NotificationEmitterRegistry emitterRegistry,
            NotificationBroadcaster broadcaster, NotificationEmailSender emailSender, Clock clock) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.emitterRegistry = emitterRegistry;
        this.broadcaster = broadcaster;
        this.emailSender = emailSender;
        this.clock = clock;
    }

    /**
     * 회원이 이 종류의 알림을 꺼두었다면 알림을 만들지도, 보내지도 않는다.
     *
     * <p>예매·취소는 커밋이 끝난 뒤(afterCommit)에 이 메서드를 부른다. 그 시점에는 원래 트랜잭션이 이미 끝나
     * 그대로 합류하면 저장이 반영되지 않으므로, 언제나 새 트랜잭션에서 저장한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(Long memberId, NotificationType type, String title, String message,
            ReservationEmailContent emailContent) {
        if (isEnabled(memberId, type)) {
            LocalDateTime now = LocalDateTime.now(clock);
            Notification notification = notificationRepository
                    .save(new Notification(memberId, type, title, message, now));
            broadcaster.broadcast(memberId, NotificationResponse.from(notification));
        }
        // 이메일 본문은 예매 정보로 만들기 때문에, 예매 정보가 없는 알림(양도 대기 등)은 이메일을 건너뛴다.
        if (emailContent != null && isEmailEnabled(memberId, type)) {
            emailSender.sendReservationMail(memberId, type, emailContent);
        }
    }

    public List<NotificationPreferenceResponse> getPreferences(Long memberId) {
        Map<NotificationType, NotificationPreference> saved = preferenceRepository.findAllByMemberId(memberId).stream()
                .collect(Collectors.toMap(NotificationPreference::getType, preference -> preference));
        return Arrays.stream(NotificationType.values())
                .filter(NotificationType::isControllable)
                .map(type -> {
                    NotificationPreference preference = saved.get(type);
                    boolean enabled = preference == null || preference.isEnabled();
                    boolean emailEnabled = preference == null || preference.isEmailEnabled();
                    return new NotificationPreferenceResponse(type, type.getLabel(), enabled, emailEnabled);
                })
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
                        () -> preferenceRepository.save(new NotificationPreference(memberId, type, enabled, true)));
    }

    /** 이메일 알림은 회원이 꺼두지 않은 이상 보낸다. (기본값 켜짐) */
    @Transactional
    public void updateEmailPreference(Long memberId, NotificationType type, boolean emailEnabled) {
        if (!type.isControllable()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "설정할 수 없는 알림 유형입니다.");
        }
        preferenceRepository.findByMemberIdAndType(memberId, type)
                .ifPresentOrElse(
                        preference -> preference.updateEmailEnabled(emailEnabled),
                        () -> preferenceRepository.save(new NotificationPreference(memberId, type, true, emailEnabled)));
    }

    private boolean isEnabled(Long memberId, NotificationType type) {
        if (!type.isControllable()) {
            return true;
        }
        return preferenceRepository.findByMemberIdAndType(memberId, type)
                .map(NotificationPreference::isEnabled)
                .orElse(true);
    }

    private boolean isEmailEnabled(Long memberId, NotificationType type) {
        if (!type.isControllable()) {
            return false;
        }
        return preferenceRepository.findByMemberIdAndType(memberId, type)
                .map(NotificationPreference::isEmailEnabled)
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
