package com.ballpark.ticketing.stadium;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatSectionRepository extends JpaRepository<SeatSection, Long> {

    List<SeatSection> findByStadiumIdOrderByDisplayOrder(Long stadiumId);
}
