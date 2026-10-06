package com.ballpark.ticketing.community.dto;

import java.util.List;

/**
 * 게시글 목록 한 쪽.
 *
 * @param page       지금 쪽 (0부터)
 * @param size       한 쪽에 담는 글 수
 * @param totalCount 조건(분류·검색어)에 맞는 전체 글 수
 * @param totalPages 전체 쪽 수. 글이 없으면 0
 * @param hasMore    다음 쪽이 있는지
 */
public record PostPageResponse(List<PostSummaryResponse> items, boolean hasMore, int page, int size, long totalCount,
        int totalPages) {
}
