package com.ballpark.ticketing.lostproperty.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.lostproperty.LostProperty;
import com.ballpark.ticketing.lostproperty.LostStatus;

public record LostPropertyResponse(
        Long id,
        String title,
        String description,
        String stadiumName,
        String specificLocation,
        String category,
        String imageUrl,
        String storageLocation,
        LostStatus status,
        LocalDateTime lostOrFoundDate,
        LocalDateTime createdAt) {

    public static LostPropertyResponse from(LostProperty property) {
        return new LostPropertyResponse(property.getId(), property.getTitle(), property.getDescription(),
                property.getStadiumName(), property.getSpecificLocation(), property.getCategory(),
                property.getImageUrl(), property.getStorageLocation(), property.getStatus(),
                property.getLostOrFoundDate(), property.getCreatedAt());
    }
}
