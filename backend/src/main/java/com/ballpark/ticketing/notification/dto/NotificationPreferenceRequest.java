package com.ballpark.ticketing.notification.dto;

import jakarta.validation.constraints.NotNull;

public record NotificationPreferenceRequest(@NotNull Boolean enabled) {
}
