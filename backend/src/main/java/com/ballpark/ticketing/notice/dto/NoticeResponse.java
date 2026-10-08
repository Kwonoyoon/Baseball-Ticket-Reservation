package com.ballpark.ticketing.notice.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.notice.Notice;
import com.ballpark.ticketing.notice.NoticeCategory;
import com.ballpark.ticketing.notice.NoticeScope;

public record NoticeResponse(
        Long id,
        NoticeScope scope,
        NoticeCategory category,
        String title,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static NoticeResponse from(Notice notice) {
        return new NoticeResponse(notice.getId(), notice.getScope(), notice.getCategory(), notice.getTitle(),
                notice.getContent(), notice.getCreatedAt(), notice.getUpdatedAt());
    }
}
