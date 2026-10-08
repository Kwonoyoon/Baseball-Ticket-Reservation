package com.ballpark.ticketing.stadium;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatSectionRepository extends JpaRepository<SeatSection, Long> {

    /** 판매 중인 구역만 표시 순서대로 돌려준다. */
    List<SeatSection> findByStadiumIdAndActiveTrueOrderByDisplayOrder(Long stadiumId);

    /** 여러 구장의 판매 중인 구역을 한 번에. 구장별 전체 좌석 수를 계산할 때 쓴다. */
    List<SeatSection> findByStadiumIdInAndActiveTrue(java.util.Collection<Long> stadiumIds);
}
