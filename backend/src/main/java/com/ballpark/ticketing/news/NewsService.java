package com.ballpark.ticketing.news;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 언론사 RSS에서 KBO 뉴스를 받아 오고, 한동안 같은 목록을 재사용한다.
 * 화면이 열릴 때마다 외부 사이트에 요청하면 느려지고 상대 서버에도 부담이라 캐시한다.
 * 받아 오기에 실패하면 이전 목록(없으면 빈 목록)을 그대로 쓰고 1분 뒤에 다시 시도한다.
 * 뉴스는 장식이라 실패해도 메인 화면의 나머지는 정상으로 뜬다.
 */
@Service
public class NewsService {

    private static final Logger log = LoggerFactory.getLogger(NewsService.class);
    private static final Duration RETRY_AFTER_FAILURE = Duration.ofMinutes(1);
    private static final Duration TIMEOUT = Duration.ofSeconds(8);

    private final NewsProperties properties;
    private final Clock clock;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private volatile List<NewsItem> items = List.of();
    private volatile Instant nextFetchAt = Instant.MIN;

    public NewsService(NewsProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public List<NewsItem> getNews() {
        if (!properties.enabled()) {
            return List.of();
        }
        if (!Instant.now(clock).isBefore(nextFetchAt)) {
            refresh();
        }
        return items;
    }

    /** 여러 요청이 동시에 만료를 보면 한 번만 받아 오도록 잠그고, 잠금 안에서 다시 확인한다. */
    private synchronized void refresh() {
        Instant now = Instant.now(clock);
        if (now.isBefore(nextFetchAt)) {
            return;
        }
        try {
            items = fetch();
            nextFetchAt = now.plus(properties.cacheTtl());
        } catch (Exception e) {
            log.warn("KBO 뉴스를 받아 오지 못했습니다. 이전 목록을 유지합니다. url={}", properties.feedUrl(), e);
            nextFetchAt = now.plus(RETRY_AFTER_FAILURE);
        }
    }

    private List<NewsItem> fetch() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(properties.feedUrl()))
                .timeout(TIMEOUT)
                .header("User-Agent", "SAFETICKET-learning-project (RSS reader)")
                .GET()
                .build();
        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream body = response.body()) {
            if (response.statusCode() != 200) {
                throw new IllegalStateException("RSS 응답 코드 " + response.statusCode());
            }
            return NewsFeedParser.parse(body, properties.sourceName(), properties.keywords(),
                    properties.maxItems());
        }
    }
}
