package com.ballpark.ticketing.admin;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
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

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "ticketing.admin.username=DashAdmin",
        "ticketing.admin.password=dash-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminDashboardIntegrationTest {

    private static final String PASSWORD = "password123";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsBootstrapAdmin() throws Exception {
        adminToken = tokenOf(login("dashadmin", "dash-admin-password"));
    }

    @Test
    void 대시보드는_관리자만_볼_수_있다() throws Exception {
        String memberToken = signupAndLogin();

        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test
    void 오늘_집계와_최근_7일_추이와_예매율_순위를_준다() throws Exception {
        signupAndLogin();
        String today = LocalDate.now(SEOUL).toString();

        mockMvc.perform(get("/api/admin/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(today))
                // 방금 가입한 회원이 오늘 신규 가입에 잡힌다.
                .andExpect(jsonPath("$.today.newMembers").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.today.reservations").isNumber())
                .andExpect(jsonPath("$.today.revenue").isNumber())
                // 관리자 계정까지 포함해 활성 회원이 두 명 이상이다.
                .andExpect(jsonPath("$.pending.totalMembers").value(greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.pending.reports").isNumber())
                // 추이는 오늘을 맨 끝으로 7일치다.
                .andExpect(jsonPath("$.last7Days", hasSize(7)))
                .andExpect(jsonPath("$.last7Days[6].date").value(today))
                .andExpect(jsonPath("$.topGames").isArray());
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                                + "@ballpark.com\",\"password\":\"" + PASSWORD + "\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        return tokenOf(login(username, PASSWORD));
    }

    private String login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private static String tokenOf(String loginBody) {
        return JsonPath.read(loginBody, "$.accessToken");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
