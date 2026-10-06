package com.ballpark.ticketing.news;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

/** 실제 연합뉴스 RSS 모양(CDATA 제목, media 네임스페이스 사진, +0900 날짜)을 줄여서 만든 입력으로 규칙을 확인한다. */
class NewsFeedParserTest {

    private static final List<String> KEYWORDS = List.of("KBO", "프로야구");

    private static final String FEED = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
              <channel>
                <item>
                  <title><![CDATA[흥행 태풍 2026 프로야구, 역대 최다관중]]></title>
                  <link>https://www.yna.co.kr/view/A1</link>
                  <pubDate>Tue, 6 Oct 2026 12:04:05 +0900</pubDate>
                  <media:content url="https://img.yna.co.kr/a1.jpg" type="image/jpeg"></media:content>
                  <media:content url="https://img.yna.co.kr/a1-2.jpg" type="image/jpeg"></media:content>
                </item>
                <item>
                  <title><![CDATA[아시안게임 농구 결승]]></title>
                  <link>https://www.yna.co.kr/view/A2</link>
                  <pubDate>Tue, 6 Oct 2026 12:30:00 +0900</pubDate>
                </item>
                <item>
                  <title>홈런왕 경쟁 막판 KBO 개인 타이틀</title>
                  <link>https://www.yna.co.kr/view/A3</link>
                  <pubDate>Tue, 6 Oct 2026 13:00:00 +0900</pubDate>
                  <media:content url="http://img.yna.co.kr/insecure.jpg" type="image/jpeg"></media:content>
                </item>
                <item>
                  <title>프로야구 위험한 링크</title>
                  <link>javascript:alert(1)</link>
                  <pubDate>Tue, 6 Oct 2026 14:00:00 +0900</pubDate>
                </item>
                <item>
                  <title>프로야구 날짜 모름</title>
                  <link>https://www.yna.co.kr/view/A5</link>
                </item>
              </channel>
            </rss>
            """;

    @Test
    void 키워드가_있는_기사만_최신순으로_고르고_날짜가_없는_기사는_맨_뒤로_보낸다() throws Exception {
        List<NewsItem> items = parse(FEED, 10);

        assertThat(items).extracting(NewsItem::title).containsExactly(
                "홈런왕 경쟁 막판 KBO 개인 타이틀", "흥행 태풍 2026 프로야구, 역대 최다관중", "프로야구 날짜 모름");
    }

    @Test
    void 사진은_첫_https_주소만_쓰고_http나_없는_경우는_null이다() throws Exception {
        List<NewsItem> items = parse(FEED, 10);

        assertThat(items.get(0).imageUrl()).isNull(); // http 사진은 https 페이지에서 막혀서 쓰지 않는다
        assertThat(items.get(1).imageUrl()).isEqualTo("https://img.yna.co.kr/a1.jpg");
        assertThat(items.get(2).imageUrl()).isNull();
    }

    @Test
    void 날짜는_한국_시각으로_바꾸고_출처는_설정값을_쓴다() throws Exception {
        NewsItem item = parse(FEED, 10).get(1);

        assertThat(item.publishedAt()).isEqualTo(LocalDateTime.of(2026, 10, 6, 12, 4, 5));
        assertThat(item.source()).isEqualTo("연합뉴스");
    }

    @Test
    void http가_아닌_링크는_버린다() throws Exception {
        assertThat(parse(FEED, 10)).noneMatch(item -> item.link().startsWith("javascript:"));
    }

    @Test
    void 최대_개수만큼만_돌려준다() throws Exception {
        assertThat(parse(FEED, 2)).hasSize(2);
    }

    @Test
    void DOCTYPE이_들어_있는_XML은_외부_엔티티_공격이라_거부한다() {
        String malicious = """
                <?xml version="1.0"?>
                <!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
                <rss><channel><item><title>프로야구 &xxe;</title><link>https://a.example/1</link></item></channel></rss>
                """;

        assertThatThrownBy(() -> parse(malicious, 5)).isInstanceOf(Exception.class);
    }

    private static List<NewsItem> parse(String xml, int max) throws Exception {
        return NewsFeedParser.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), "연합뉴스",
                KEYWORDS, max);
    }
}
