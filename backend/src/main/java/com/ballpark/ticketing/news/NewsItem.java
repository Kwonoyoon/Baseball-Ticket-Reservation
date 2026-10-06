package com.ballpark.ticketing.news;

import java.time.LocalDateTime;

/**
 * 뉴스 한 건. 본문은 가져오지 않고 제목·원문 링크·출처만 둔다. imageUrl은 RSS가 준 사진 주소(없으면 null)이며
 * 우리 서버에 저장하지 않고 화면이 출처 서버에서 바로 불러온다.
 */
public record NewsItem(String title, String link, String source, String imageUrl, LocalDateTime publishedAt) {
}
