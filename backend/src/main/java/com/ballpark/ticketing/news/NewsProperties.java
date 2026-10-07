package com.ballpark.ticketing.news;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param enabled    false면 외부에 요청하지 않고 빈 목록을 준다. (테스트·오프라인 개발용)
 * @param feedUrl    언론사 RSS 주소
 * @param sourceName 화면에 표시할 출처 이름
 * @param keywords   제목에 이 중 하나가 들어 있는 기사만 쓴다.
 * @param maxItems   돌려줄 최대 기사 수
 * @param cacheTtl   한 번 받은 목록을 다시 받지 않고 쓰는 시간
 */
@ConfigurationProperties(prefix = "ticketing.news")
public record NewsProperties(boolean enabled, String feedUrl, String sourceName, List<String> keywords,
        int maxItems, Duration cacheTtl) {
}
