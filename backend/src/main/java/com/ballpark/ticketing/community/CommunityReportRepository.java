package com.ballpark.ticketing.community;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    boolean existsByTargetTypeAndTargetIdAndReporterId(ReportTargetType targetType, Long targetId, Long reporterId);

    List<CommunityReport> findAllByOrderByCreatedAtDesc();
}
