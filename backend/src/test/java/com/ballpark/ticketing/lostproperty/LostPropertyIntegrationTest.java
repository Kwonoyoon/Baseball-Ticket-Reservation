package com.ballpark.ticketing.lostproperty;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

/** 팀원이 만든 분실물 기능을 옮겨 온 것. 등록·목록·상세와, 관리자만 바꿀 수 있는 보관 상태를 확인한다. */
@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LostPropertyIntegrationTest {

    private static final String STADIUM = "서울종합운동장 야구장";

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsBootstrapAdmin() throws Exception {
        adminToken = JsonPath.read(login("rootadmin", "root-admin-password")
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void 회원이_분실물을_등록하면_접수_상태로_목록과_상세에_나온다() throws Exception {
        String member = signupAndLogin();
        String tag = UUID.randomUUID().toString().substring(0, 8);

        String body = mockMvc.perform(post("/api/lost-properties").header(HttpHeaders.AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("검은 지갑-" + tag, STADIUM, "지갑/신분증", "https://example.com/a.jpg")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REPORTED"))
                // 보관 장소는 관리자가 정할 때까지 비어 있다.
                .andExpect(jsonPath("$.storageLocation").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();

        mockMvc.perform(get("/api/lost-properties").header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem((int) id)));
        mockMvc.perform(get("/api/lost-properties/" + id).header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("검은 지갑-" + tag))
                .andExpect(jsonPath("$.imageUrl").value("https://example.com/a.jpg"));
    }

    @Test
    void 구장과_상태로_걸러_볼_수_있다() throws Exception {
        String member = signupAndLogin();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        String other = "고척 스카이돔";
        long first = create(member, "우산-" + tag, STADIUM);
        long second = create(member, "모자-" + tag, other);
        mockMvc.perform(patch("/api/admin/lost-properties/" + second + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"KEEPING\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/lost-properties").param("stadiumName", other)
                        .header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(jsonPath("$[?(@.stadiumName != '" + other + "')]").isEmpty())
                .andExpect(jsonPath("$[*].id").value(hasItem((int) second)));
        mockMvc.perform(get("/api/lost-properties").param("status", "KEEPING")
                        .header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(jsonPath("$[?(@.status != 'KEEPING')]").isEmpty())
                .andExpect(jsonPath("$[*].id").value(hasItem((int) second)));
        // 접수 상태인 글은 KEEPING 필터에 걸리지 않는다.
        mockMvc.perform(get("/api/lost-properties").param("status", "KEEPING")
                        .header(HttpHeaders.AUTHORIZATION, bearer(member)))
                .andExpect(jsonPath("$[?(@.id == " + first + ")]").isEmpty());
    }

    @Test
    void 비회원은_쓰거나_볼_수_없고_잘못된_입력은_400이다() throws Exception {
        String member = signupAndLogin();

        mockMvc.perform(get("/api/lost-properties")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/lost-properties").contentType(MediaType.APPLICATION_JSON)
                        .content(payload("제목", STADIUM, "의류", null)))
                .andExpect(status().isUnauthorized());

        // 제목·구장·카테고리가 비면 거절한다.
        for (String bad : new String[] { payload("  ", STADIUM, "의류", null), payload("제목", "", "의류", null),
                payload("제목", STADIUM, "", null),
                // javascript: 같은 주소는 이미지로 그릴 때 위험해 거절한다.
                payload("제목", STADIUM, "의류", "javascript:alert(1)") }) {
            mockMvc.perform(post("/api/lost-properties").header(HttpHeaders.AUTHORIZATION, bearer(member))
                            .contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void 없는_분실물은_404다() throws Exception {
        mockMvc.perform(get("/api/lost-properties/99999999").header(HttpHeaders.AUTHORIZATION, bearer(signupAndLogin())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LOST_PROPERTY_NOT_FOUND"));
    }

    @Test
    void 보관_상태와_장소는_관리자만_바꾼다() throws Exception {
        String member = signupAndLogin();
        long id = create(member, "에어팟-" + UUID.randomUUID(), STADIUM);

        // 일반 회원은 바꿀 수 없다.
        mockMvc.perform(patch("/api/admin/lost-properties/" + id + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(member))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CLAIMED\"}"))
                .andExpect(status().isForbidden());

        // 관리자는 보관 중으로 바꾸며 보관 장소를 적는다.
        mockMvc.perform(patch("/api/admin/lost-properties/" + id + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"KEEPING\",\"storageLocation\":\"1층 안내소\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("KEEPING"))
                .andExpect(jsonPath("$.storageLocation").value("1층 안내소"));

        // 보관 장소를 비워 보내면 이전 장소를 유지한 채 상태만 바뀐다.
        mockMvc.perform(patch("/api/admin/lost-properties/" + id + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CLAIMED\"}"))
                .andExpect(jsonPath("$.status").value("CLAIMED"))
                .andExpect(jsonPath("$.storageLocation").value("1층 안내소"));

        // 상태 값이 없으면 400, 없는 분실물은 404
        mockMvc.perform(patch("/api/admin/lost-properties/" + id + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/admin/lost-properties/99999999/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"KEEPING\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 등록_화면에서_고를_구장_이름을_준다() throws Exception {
        mockMvc.perform(get("/api/lost-properties/stadiums").header(HttpHeaders.AUTHORIZATION, bearer(signupAndLogin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    private long create(String token, String title, String stadium) throws Exception {
        String body = mockMvc.perform(post("/api/lost-properties").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(payload(title, stadium, "전자기기", null)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private static String payload(String title, String stadium, String category, String imageUrl) {
        return "{\"title\":\"" + title + "\",\"description\":\"1루 쪽에서 잃어버렸어요\",\"stadiumName\":\"" + stadium
                + "\",\"specificLocation\":\"1루 블루석 12열\",\"category\":\"" + category + "\""
                + (imageUrl == null ? "" : ",\"imageUrl\":\"" + imageUrl + "\"")
                + ",\"lostOrFoundDate\":\"2026-10-05T18:30:00\"}";
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
