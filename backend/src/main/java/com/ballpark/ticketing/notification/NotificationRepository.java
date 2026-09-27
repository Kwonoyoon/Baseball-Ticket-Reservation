package com.ballpark.ticketing.notification;

import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByMemberIdOrderByCreatedAtDesc(Long memberId, Limit limit);

    long countByMemberIdAndReadFalse(Long memberId);

    List<Notification> findAllByMemberIdAndReadFalse(Long memberId);

    void deleteAllByMemberId(Long memberId);
}
