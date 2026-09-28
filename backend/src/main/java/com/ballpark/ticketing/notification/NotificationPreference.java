package com.ballpark.ticketing.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "notification_preferences",
        uniqueConstraints = @UniqueConstraint(columnNames = { "member_id", "type" }))
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private boolean emailEnabled;

    protected NotificationPreference() {
    }

    public NotificationPreference(Long memberId, NotificationType type, boolean enabled, boolean emailEnabled) {
        this.memberId = memberId;
        this.type = type;
        this.enabled = enabled;
        this.emailEnabled = emailEnabled;
    }

    public void updateEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void updateEmailEnabled(boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
    }

    public Long getId() {
        return id;
    }

    public Long getMemberId() {
        return memberId;
    }

    public NotificationType getType() {
        return type;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }
}
