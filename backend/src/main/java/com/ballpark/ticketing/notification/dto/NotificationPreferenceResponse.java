package com.ballpark.ticketing.notification.dto;

import com.ballpark.ticketing.notification.NotificationType;

public record NotificationPreferenceResponse(NotificationType type, String label, boolean enabled) {
}
