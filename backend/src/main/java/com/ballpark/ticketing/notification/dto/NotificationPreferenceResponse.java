package com.ballpark.ticketing.notification.dto;

import com.ballpark.ticketing.notification.NotificationType;

/** description은 여러 알림을 묶은 설정일 때만 값이 있다. */
public record NotificationPreferenceResponse(NotificationType type, String label, String description,
        boolean enabled, boolean emailEnabled) {
}
