package com.ballpark.ticketing.notification;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ballpark.ticketing.global.security.AuthMember;
import com.ballpark.ticketing.notification.dto.NotificationPreferenceRequest;
import com.ballpark.ticketing.notification.dto.NotificationPreferenceResponse;
import com.ballpark.ticketing.notification.dto.NotificationResponse;
import com.ballpark.ticketing.notification.dto.UnreadCountResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> getNotifications(@AuthenticationPrincipal AuthMember authMember) {
        return notificationService.getNotifications(authMember.id());
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse getUnreadCount(@AuthenticationPrincipal AuthMember authMember) {
        return new UnreadCountResponse(notificationService.getUnreadCount(authMember.id()));
    }

    @PostMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAsRead(@AuthenticationPrincipal AuthMember authMember, @PathVariable Long notificationId) {
        notificationService.markAsRead(authMember.id(), notificationId);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllAsRead(@AuthenticationPrincipal AuthMember authMember) {
        notificationService.markAllAsRead(authMember.id());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(@AuthenticationPrincipal AuthMember authMember) {
        notificationService.deleteAll(authMember.id());
    }

    @GetMapping("/preferences")
    public List<NotificationPreferenceResponse> getPreferences(@AuthenticationPrincipal AuthMember authMember) {
        return notificationService.getPreferences(authMember.id());
    }

    @PostMapping("/preferences/{type}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updatePreference(@AuthenticationPrincipal AuthMember authMember, @PathVariable NotificationType type,
            @Valid @RequestBody NotificationPreferenceRequest request) {
        notificationService.updatePreference(authMember.id(), type, request.enabled());
    }

    @PostMapping("/preferences/{type}/email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateEmailPreference(@AuthenticationPrincipal AuthMember authMember,
            @PathVariable NotificationType type, @Valid @RequestBody NotificationPreferenceRequest request) {
        notificationService.updateEmailPreference(authMember.id(), type, request.enabled());
    }

    /**
     * 브라우저 EventSource는 커스텀 헤더를 못 보내므로, 이 요청만 JwtAuthenticationFilter가
     * 쿼리 파라미터 token으로도 인증을 받아준다.
     */
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal AuthMember authMember) {
        return notificationService.subscribe(authMember.id());
    }
}
