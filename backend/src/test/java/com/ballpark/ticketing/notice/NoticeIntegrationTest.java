package com.ballpark.ticketing.notice;

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

@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NoticeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsBootstrapAdmin() throws Exception {
        adminToken = JsonPath.read(login("rootadmin", "root-admin-password")
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void 관리자가_공지를_올리면_비회원도_자리별로_읽는다() throws Exception {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        long global = create(adminToken, "GLOBAL", "MAINTENANCE", "점검-" + tag, "새벽 2시 점검");
        long community = create(adminToken, "COMMUNITY", "EVENT", "이벤트-" + tag, "응원 이벤트");

        // 로그인 없이 읽는다. 자리를 나눠 보면 해당 자리의 공지만 나온다.
        mockMvc.perform(get("/api/notices").param("scope", "GLOBAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.scope != 'GLOBAL')]").isEmpty())
                .andExpect(jsonPath("$[*].id").value(hasItem((int) global)))
                .andExpect(jsonPath("$[?(@.id == " + global + ")].category").value(hasItem("MAINTENANCE")));
        mockMvc.perform(get("/api/notices").param("scope", "COMMUNITY"))
                .andExpect(jsonPath("$[?(@.scope != 'COMMUNITY')]").isEmpty())
                .andExpect(jsonPath("$[*].id").value(hasItem((int) community)));

        // 최신 공지가 먼저, size로 개수를 줄인다.
        String body = mockMvc.perform(get("/api/notices").param("size", "2"))
                .andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).hasSize(2).isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    @Test
    void 일반_회원과_비회원은_공지를_쓰거나_고치거나_지울_수_없다() throws Exception {
        long id = create(adminToken, "GLOBAL", "UPDATE", "권한-" + UUID.randomUUID(), "내용");
        String member = signupAndLogin();
        String payload = payload("GLOBAL", "UPDATE", "해킹", "내용");

        // 비회원은 401, 일반 회원은 403
        mockMvc.perform(post("/api/admin/notices").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/notices").header(HttpHeaders.AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/notices/" + id).header(HttpHeaders.AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/admin/notices/" + id).header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void 공지를_고치고_지울_수_있고_없는_공지는_404다() throws Exception {
        long id = create(adminToken, "GLOBAL", "UPDATE", "수정전-" + UUID.randomUUID(), "내용");

        mockMvc.perform(put("/api/admin/notices/" + id).header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(payload("COMMUNITY", "EVENT", "수정후", "바뀐 내용")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("COMMUNITY"))
                .andExpect(jsonPath("$.category").value("EVENT"))
                .andExpect(jsonPath("$.title").value("수정후"));

        mockMvc.perform(delete("/api/admin/notices/" + id).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/admin/notices/" + id).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
    }

    @Test
    void 제목이나_내용이_비었거나_종류가_없으면_거절한다() throws Exception {
        for (String bad : List.of(
                payload("GLOBAL", "UPDATE", "  ", "내용"),
                payload("GLOBAL", "UPDATE", "제목", ""),
                "{\"category\":\"UPDATE\",\"title\":\"제목\",\"content\":\"내용\"}",
                payload("GLOBAL", "UPDATE", "가".repeat(101), "내용"))) {
            mockMvc.perform(post("/api/admin/notices").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                            .contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void 뉴스는_꺼져_있으면_빈_목록이고_로그인_없이_부를_수_있다() throws Exception {
        mockMvc.perform(get("/api/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    private long create(String token, String scope, String category, String title, String content)
            throws Exception {
        String body = mockMvc.perform(post("/api/admin/notices").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(payload(scope, category, title, content)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private static String payload(String scope, String category, String title, String content) {
        return "{\"scope\":\"" + scope + "\",\"category\":\"" + category + "\",\"title\":\"" + title
                + "\",\"content\":\"" + content + "\"}";
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                                + "@ballpark.com\",\"password\":\"password123\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        return JsonPath.read(login(username, "password123").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
