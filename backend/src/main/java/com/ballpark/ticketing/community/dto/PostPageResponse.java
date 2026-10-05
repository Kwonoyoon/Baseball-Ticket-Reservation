package com.ballpark.ticketing.community.dto;

import java.util.List;

/** 목록 페이징. 전체 개수는 세지 않고, 다음 페이지 존재 여부만 알려준다("더 보기" 버튼용). */
public record PostPageResponse(List<PostSummaryResponse> items, boolean hasMore) {
}
