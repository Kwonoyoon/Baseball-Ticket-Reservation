package com.ballpark.ticketing.news;

import java.io.InputStream;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/** RSS 2.0 XML에서 KBO 기사만 골라 NewsItem으로 바꾼다. 네트워크는 건드리지 않아 입력만으로 시험할 수 있다. */
final class NewsFeedParser {

    private static final String MEDIA_NS = "http://search.yahoo.com/mrss/";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private NewsFeedParser() {
    }

    static List<NewsItem> parse(InputStream xml, String source, List<String> keywords, int maxItems)
            throws Exception {
        Document document = secureFactory().newDocumentBuilder().parse(xml);
        NodeList items = document.getElementsByTagName("item");

        List<NewsItem> result = new ArrayList<>();
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String title = text(item, "title");
            String link = text(item, "link");
            // 제목이나 링크가 없거나, http(s)가 아닌 주소(javascript: 등)는 화면에 링크로 걸면 위험하다.
            if (title == null || !isWebUrl(link) || !matches(title, keywords)) {
                continue;
            }
            ZonedDateTime published = parseDate(text(item, "pubDate"));
            result.add(new NewsItem(title, link, source, firstImage(item),
                    published == null ? null : published.withZoneSameInstant(SEOUL).toLocalDateTime()));
        }
        // 최신 기사가 먼저. 날짜가 없는 기사는 맨 뒤로 보낸다.
        result.sort(Comparator.comparing(NewsItem::publishedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return result.size() > maxItems ? List.copyOf(result.subList(0, maxItems)) : List.copyOf(result);
    }

    /** 외부에서 받은 XML이라 DOCTYPE(외부 엔티티 공격)을 아예 거부한다. */
    private static DocumentBuilderFactory secureFactory() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private static String text(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return null;
        }
        String value = nodes.item(0).getTextContent();
        return value == null || value.isBlank() ? null : value.strip();
    }

    /** 첫 번째 media:content 사진. https 주소만 쓴다. (http 사진은 https 페이지에서 막힌다) */
    private static String firstImage(Element item) {
        NodeList contents = item.getElementsByTagNameNS(MEDIA_NS, "content");
        for (int i = 0; i < contents.getLength(); i++) {
            Node node = contents.item(i);
            if (node instanceof Element element) {
                String url = element.getAttribute("url");
                if (url.startsWith("https://")) {
                    return url;
                }
            }
        }
        return null;
    }

    private static boolean isWebUrl(String url) {
        return url != null && (url.startsWith("https://") || url.startsWith("http://"));
    }

    private static boolean matches(String title, List<String> keywords) {
        String lower = title.toLowerCase(Locale.ROOT);
        return keywords.stream().anyMatch(keyword -> lower.contains(keyword.toLowerCase(Locale.ROOT)));
    }

    private static ZonedDateTime parseDate(String value) {
        if (value == null) {
            return null;
        }
        try {
            return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
