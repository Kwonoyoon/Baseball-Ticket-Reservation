package com.ballpark.ticketing.community;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    boolean existsByTargetTypeAndTargetIdAndReporterId(ReportTargetType targetType, Long targetId, Long reporterId);

    List<CommunityReport> findAllByOrderByCreatedAtDesc();

    /** 같은 대상에 대한 처리전 신고들. 하나를 처리하면 같은 대상의 신고를 함께 처리한다. */
    List<CommunityReport> findAllByTargetTypeAndTargetIdInAndStatus(ReportTargetType targetType,
            Collection<Long> targetIds, ReportStatus status);
}
