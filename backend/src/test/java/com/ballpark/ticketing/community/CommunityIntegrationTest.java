package com.ballpark.ticketing.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

/** V2 시드 데이터의 구단(id=1, LG)을 그대로 쓴다. */
@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityIntegrationTest {

    private static final String PASSWORD = "password123";
    private static final long TEAM_ID = 1L;

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsBootstrapAdmin() throws Exception {
        adminToken = login("rootadmin", "root-admin-password").andReturn().getResponse().getContentAsString();
        adminToken = JsonPath.read(adminToken, "$.accessToken");
    }

    @Test
    void 구단별_게시글_수를_집계한다() throws Exception {
        String token = signup();
        long before = teamPostCount(TEAM_ID);

        createPost(token, "집계용 글 1", "내용1");
        createPost(token, "집계용 글 2", "내용2");

        assertThat(teamPostCount(TEAM_ID)).isEqualTo(before + 2);
    }

    @Test
    void 제목_또는_본문으로_검색하고_와일드카드는_글자로_찾는다() throws Exception {
        String token = signup();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        createPost(token, "제목매칭-" + tag, "평범한 본문");
        createPost(token, "본문쪽", "여기에 Needle" + tag + " 가 있다");
        createPost(token, "퍼센트-" + tag, "할인 100% 행사");
        createPost(token, "다른글-" + tag, "관계없는 내용");

        // 제목에서 찾고, 대소문자는 가리지 않는다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", "제목매칭-" + tag.toUpperCase()))
                .andExpect(jsonPath("$.items[*].title").value(org.hamcrest.Matchers.contains("제목매칭-" + tag)));

        // 본문에서도 찾는다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", "needle" + tag))
                .andExpect(jsonPath("$.items[*].title").value(org.hamcrest.Matchers.contains("본문쪽")));

        // %는 "아무거나"가 아니라 % 글자다. 와일드카드로 먹었다면 이 구단의 모든 글이 나온다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", "100%"))
                .andExpect(jsonPath("$.items[?(@.title == '퍼센트-" + tag + "')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.title == '다른글-" + tag + "')]").isEmpty());

        // 공백뿐이면 검색 없이 전체 목록이다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", "   "))
                .andExpect(jsonPath("$.items[?(@.title == '다른글-" + tag + "')]").isNotEmpty());
    }

    @Test
    void 인기글은_좋아요_많은_순이고_좋아요가_없는_글은_뺀다() throws Exception {
        String author = signup();
        String fan = signup();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        // 구단 하나를 이 테스트만 쓰는 건 아니라서, 이 글들의 상대 순서만 확인한다.
        Long none = createPost(author, "무관심-" + tag, "내용");
        Long one = createPost(author, "하나-" + tag, "내용");
        Long two = createPost(author, "둘-" + tag, "내용");
        like(fan, one);
        like(fan, two);
        like(author, two);

        String body = mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts/popular").param("limit", "10"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$[*].id");
        // 좋아요 2개인 글이 1개인 글보다 앞이고, 0개인 글은 목록에 없다.
        assertThat(ids).contains(two.intValue(), one.intValue()).doesNotContain(none.intValue());
        assertThat(ids.indexOf(two.intValue())).isLessThan(ids.indexOf(one.intValue()));

        // limit 만큼만 준다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts/popular").param("limit", "1"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 목록은_전체_글_수와_쪽_수를_함께_주고_쪽_크기는_1에서_50으로_맞춘다() throws Exception {
        String token = signup();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        for (int i = 1; i <= 5; i++) {
            createPost(token, "쪽나눔" + i + "-" + tag, "내용");
        }

        // 5개를 2개씩 나누면 3쪽이다. 첫 쪽은 최신 글부터 2개.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", tag).param("size", "2"))
                .andExpect(jsonPath("$.totalCount").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.items[*].title")
                        .value(org.hamcrest.Matchers.contains("쪽나눔5-" + tag, "쪽나눔4-" + tag)));

        // 마지막 쪽에는 1개만 있고 다음 쪽이 없다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", tag).param("size", "2").param("page", "2"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.hasMore").value(false));

        // 없는 쪽은 빈 목록이지만 전체 수는 그대로 알려 준다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", tag).param("size", "2").param("page", "9"))
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalPages").value(3));

        // 쪽 크기는 1~50으로, 쪽 번호는 0 이상으로 맞춘다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", tag).param("size", "1000"))
                .andExpect(jsonPath("$.size").value(50))
                .andExpect(jsonPath("$.totalPages").value(1));
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", tag).param("size", "0").param("page", "-3"))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalPages").value(5));

        // 검색 결과가 없으면 0쪽이다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("q", "없는글-" + tag))
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.totalPages").value(0))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void 분류별로_나눠_보고_목록에는_본문_미리보기가_온다() throws Exception {
        String token = signup();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        // JSON 안의 줄바꿈이라 \\n으로 쓴다.
        createPost(token, "경기-" + tag, "GAME", "어제 경기\\n정말\\n\\n  좋았다");
        createPost(token, "응원-" + tag, "CHEER", "가자");
        createPost(token, "양도-" + tag, "TICKET_TRANSFER", "1루 2연석 양도합니다");
        createPost(token, "분류없음-" + tag, null, "분류가 생기기 전 화면에서 쓴 글");

        // 경기 탭에는 경기 글만 나오고, 미리보기는 줄바꿈·공백을 한 칸으로 합친다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("category", "GAME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.category != 'GAME')]").isEmpty())
                .andExpect(jsonPath("$.items[?(@.title == '경기-" + tag + "')].preview")
                        .value(hasItem("어제 경기 정말 좋았다")));

        // 티켓 양도 탭에는 양도 글만 나온다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("category", "TICKET_TRANSFER"))
                .andExpect(jsonPath("$.items[?(@.title == '양도-" + tag + "')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.category != 'TICKET_TRANSFER')]").isEmpty());

        // 분류 없이 쓴 글은 자유로 들어간다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts").param("category", "FREE"))
                .andExpect(jsonPath("$.items[?(@.title == '분류없음-" + tag + "')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.category != 'FREE')]").isEmpty());

        // 분류를 주지 않으면 모두 보여 준다.
        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts"))
                .andExpect(jsonPath("$.items[?(@.title == '응원-" + tag + "')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.title == '경기-" + tag + "')]").isNotEmpty());
    }

    @Test
    void 글을_고치면_분류도_바뀐다() throws Exception {
        String token = signup();
        Long postId = createPost(token, "분류 바꿀 글", "FREE", "내용");

        mockMvc.perform(put("/api/posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"CHEER\",\"title\":\"분류 바꿀 글\",\"content\":\"내용\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("CHEER"));
    }

    @Test
    void 글을_쓰고_목록과_상세에서_보인다() throws Exception {
        String token = signup();

        Long postId = createPost(token, "첫 글", "반갑습니다");

        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value("첫 글"));

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("첫 글"))
                .andExpect(jsonPath("$.content").value("반갑습니다"))
                .andExpect(jsonPath("$.viewCount").value(1))
                .andExpect(jsonPath("$.mine").value(false));
    }

    @Test
    void 비회원도_목록과_상세를_볼_수_있다() throws Exception {
        String token = signup();
        Long postId = createPost(token, "공개 글", "누구나 봅니다");

        mockMvc.perform(get("/api/teams/" + TEAM_ID + "/posts")).andExpect(status().isOk());
        mockMvc.perform(get("/api/posts/" + postId)).andExpect(status().isOk());
    }

    @Test
    void 조회할_때마다_조회수가_오른다() throws Exception {
        String token = signup();
        Long postId = createPost(token, "제목", "내용");

        mockMvc.perform(get("/api/posts/" + postId));
        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(jsonPath("$.viewCount").value(2));
    }

    @Test
    void 작성자만_글을_수정하거나_삭제할_수_있다() throws Exception {
        String author = signup();
        String other = signup();
        Long postId = createPost(author, "원본 제목", "원본 내용");

        mockMvc.perform(put("/api/posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"남의 글\",\"content\":\"수정 시도\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"바뀐 제목\",\"content\":\"바뀐 내용\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("바뀐 제목"));

        mockMvc.perform(delete("/api/posts/" + postId).header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/posts/" + postId).header(HttpHeaders.AUTHORIZATION, bearer(author)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/posts/" + postId)).andExpect(status().isNotFound());
    }

    @Test
    void 댓글을_쓰고_지우면_글의_댓글_수가_바뀐다() throws Exception {
        String author = signup();
        String commenter = signup();
        Long postId = createPost(author, "제목", "내용");

        String commentBody = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"댓글입니다\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long commentId = ((Number) JsonPath.read(commentBody, "$.id")).longValue();

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(jsonPath("$.commentCount").value(1));
        mockMvc.perform(get("/api/posts/" + postId + "/comments"))
                .andExpect(jsonPath("$[0].content").value("댓글입니다"))
                .andExpect(jsonPath("$[0].mine").value(false));

        mockMvc.perform(delete("/api/comments/" + commentId).header(HttpHeaders.AUTHORIZATION, bearer(author)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/comments/" + commentId).header(HttpHeaders.AUTHORIZATION, bearer(commenter)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(jsonPath("$.commentCount").value(0));
    }

    @Test
    void 좋아요는_다시_누르면_취소된다() throws Exception {
        String author = signup();
        String liker = signup();
        Long postId = createPost(author, "제목", "내용");

        mockMvc.perform(post("/api/posts/" + postId + "/like").header(HttpHeaders.AUTHORIZATION, bearer(liker)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.likeCount").value(1));

        mockMvc.perform(post("/api/posts/" + postId + "/like").header(HttpHeaders.AUTHORIZATION, bearer(liker)))
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.likeCount").value(0));
    }

    @Test
    void 본인_글은_신고할_수_없고_같은_글을_두_번_신고할_수_없다() throws Exception {
        String author = signup();
        String reporter = signup();
        Long postId = createPost(author, "제목", "내용");

        mockMvc.perform(report("/api/posts/" + postId + "/report", author))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_REPORT_OWN_CONTENT"));

        mockMvc.perform(report("/api/posts/" + postId + "/report", reporter)).andExpect(status().isNoContent());
        mockMvc.perform(report("/api/posts/" + postId + "/report", reporter))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_REPORTED"));
    }

    @Test
    void 관리자는_신고_목록을_보고_글을_강제_삭제할_수_있다() throws Exception {
        String author = signup();
        String reporter = signup();
        Long postId = createPost(author, "삭제될 글", "신고 대상");
        mockMvc.perform(report("/api/posts/" + postId + "/report", reporter)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/community/reports").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetPreview").value("삭제될 글"))
                // 관리자가 신고된 글의 본문을 펼쳐 보고, 원래 글로 갈 수 있다.
                .andExpect(jsonPath("$[0].targetContent").value("신고 대상"))
                .andExpect(jsonPath("$[0].postId").value(postId))
                .andExpect(jsonPath("$[0].postTeamId").value(TEAM_ID))
                .andExpect(jsonPath("$[0].postTitle").value("삭제될 글"));

        mockMvc.perform(get("/api/admin/community/reports").header(HttpHeaders.AUTHORIZATION, bearer(author)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/community/posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/posts/" + postId)).andExpect(status().isNotFound());
    }

    @Test
    void 신고된_댓글은_내용과_어느_글에_달렸는지_보여주고_지워지면_내용을_비운다() throws Exception {
        String author = signup();
        String reporter = signup();
        Long postId = createPost(author, "댓글이 달린 글", "본문");
        String body = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header(HttpHeaders.AUTHORIZATION, bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"신고될 댓글 내용\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long commentId = ((Number) JsonPath.read(body, "$.id")).longValue();
        mockMvc.perform(report("/api/comments/" + commentId + "/report", reporter)).andExpect(status().isNoContent());

        String reportPath = "$[?(@.targetType == 'COMMENT' && @.targetId == " + commentId + ")]";
        mockMvc.perform(get("/api/admin/community/reports").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath(reportPath + ".targetContent").value("신고될 댓글 내용"))
                .andExpect(jsonPath(reportPath + ".postId").value(postId.intValue()))
                .andExpect(jsonPath(reportPath + ".postTitle").value("댓글이 달린 글"));

        mockMvc.perform(delete("/api/admin/community/comments/" + commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/admin/community/reports").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(jsonPath(reportPath + ".targetPreview").value(org.hamcrest.Matchers.contains((Object) null)))
                .andExpect(jsonPath(reportPath + ".targetContent").value(org.hamcrest.Matchers.contains((Object) null)))
                .andExpect(jsonPath(reportPath + ".postId").value(org.hamcrest.Matchers.contains((Object) null)));
    }

    private void like(String token, Long postId) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/like").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
    }

    private long teamPostCount(long teamId) throws Exception {
        String body = mockMvc.perform(get("/api/community/team-post-counts"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Object matched = JsonPath.read(body, "$[?(@.teamId == " + teamId + ")].postCount");
        java.util.List<?> list = (java.util.List<?>) matched;
        return list.isEmpty() ? 0L : ((Number) list.get(0)).longValue();
    }

    private Long createPost(String token, String title, String content) throws Exception {
        return createPost(token, title, null, content);
    }

    /** category가 null이면 요청에서 아예 뺀다. (분류가 생기기 전 화면이 보내던 모양) */
    private Long createPost(String token, String title, String category, String content) throws Exception {
        String categoryJson = category == null ? "" : "\"category\":\"" + category + "\",";
        String body = mockMvc.perform(post("/api/teams/" + TEAM_ID + "/posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{" + categoryJson + "\"title\":\"" + title + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder report(String path,
            String token) {
        return post(path)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"부적절한 내용입니다\"}");
    }

    private String signup() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                                + "@ballpark.com\",\"password\":\"" + PASSWORD + "\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        String body = login(username, PASSWORD).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
