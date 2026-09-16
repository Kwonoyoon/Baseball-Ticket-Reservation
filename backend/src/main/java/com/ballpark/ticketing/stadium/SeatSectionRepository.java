package com.ballpark.ticketing.stadium;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatSectionRepository extends JpaRepository<SeatSection, Long> {

    /** 판매 중인 구역만 표시 순서대로 돌려준다. */
    List<SeatSection> findByStadiumIdAndActiveTrueOrderByDisplayOrder(Long stadiumId);
}
