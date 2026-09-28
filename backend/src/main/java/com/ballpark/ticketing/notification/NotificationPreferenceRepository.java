package com.ballpark.ticketing.notification;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    List<NotificationPreference> findAllByMemberId(Long memberId);

    Optional<NotificationPreference> findByMemberIdAndType(Long memberId, NotificationType type);
}
