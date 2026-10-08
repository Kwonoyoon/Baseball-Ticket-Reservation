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
        LocalDateTime createdAt,
        /** 내가 올린 글인지. 화면에서 삭제 버튼을 보일지 정할 때 쓴다. (작성자 id 자체는 내려주지 않는다) */
        boolean mine) {

    public static LostPropertyResponse from(LostProperty property, Long viewerId) {
        return new LostPropertyResponse(property.getId(), property.getTitle(), property.getDescription(),
                property.getStadiumName(), property.getSpecificLocation(), property.getCategory(),
                property.getImageUrl(), property.getStorageLocation(), property.getStatus(),
                property.getLostOrFoundDate(), property.getCreatedAt(), property.isReportedBy(viewerId));
    }
}
