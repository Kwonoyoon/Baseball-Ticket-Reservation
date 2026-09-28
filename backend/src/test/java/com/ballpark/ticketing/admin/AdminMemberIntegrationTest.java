package com.ballpark.ticketing.admin;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminMemberIntegrationTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsBootstrapAdmin() throws Exception {
        // 서버 시작 시 설정의 아이디(소문자로 저장)로 관리자 계정이 만들어진다.
        String body = login("rootadmin", "root-admin-password")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.role").value("ADMIN"))
                .andReturn().getResponse().getContentAsString();
        adminToken = JsonPath.read(body, "$.accessToken");
    }

    @Test
    void 관리자_API는_관리자만_쓸_수_있다() throws Exception {
        Member member = signupAndLogin();

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/members").header(HttpHeaders.AUTHORIZATION, bearer(member.token())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mockMvc.perform(get("/api/admin/members").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test
    void 회원_목록을_검색하고_비밀번호는_내려주지_않는다() throws Exception {
        Member member = signupAndLogin();

        mockMvc.perform(get("/api/admin/members")
                        .param("keyword", member.username().toUpperCase())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].username").value(member.username()))
                .andExpect(jsonPath("$[0].role").value("MEMBER"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    void 잠그면_바로_로그아웃되고_해제하면_다시_로그인할_수_있다() throws Exception {
        Member member = signupAndLogin();

        admin(post("/api/admin/members/" + member.id() + "/lock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));
        me(member.token()).andExpect(status().isUnauthorized());
        login(member.username(), PASSWORD).andExpect(status().isLocked());

        admin(post("/api/admin/members/" + member.id() + "/unlock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.failedLoginAttempts").value(0));
        login(member.username(), PASSWORD).andExpect(status().isOk());
    }

    @Test
    void 비밀번호_실패로_잠긴_계정도_관리자가_풀어준다() throws Exception {
        Member member = signupAndLogin();
        for (int i = 0; i < 5; i++) {
            login(member.username(), "wrong-password");
        }
        login(member.username(), PASSWORD).andExpect(status().isLocked());

        admin(post("/api/admin/members/" + member.id() + "/unlock")).andExpect(status().isOk());

        login(member.username(), PASSWORD).andExpect(status().isOk());
    }

    @Test
    void 권한을_바꾸면_같은_토큰으로도_바로_반영된다() throws Exception {
        Member member = signupAndLogin();

        admin(put("/api/admin/members/" + member.id() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
        mockMvc.perform(get("/api/admin/members").header(HttpHeaders.AUTHORIZATION, bearer(member.token())))
                .andExpect(status().isOk());

        admin(put("/api/admin/members/" + member.id() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"MEMBER\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/members").header(HttpHeaders.AUTHORIZATION, bearer(member.token())))
                .andExpect(status().isForbidden());
    }

    @Test
    void 본인_계정은_잠그거나_권한을_바꿀_수_없고_관리자는_탈퇴할_수_없다() throws Exception {
        String body = me(adminToken).andReturn().getResponse().getContentAsString();
        Integer adminId = JsonPath.read(body, "$.id");

        admin(post("/api/admin/members/" + adminId + "/lock"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_MODIFY_SELF"));
        admin(put("/api/admin/members/" + adminId + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"MEMBER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_MODIFY_SELF"));
        mockMvc.perform(post("/api/members/me/withdraw")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"root-admin-password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ADMIN_CANNOT_WITHDRAW"));
    }

    @Test
    void 회원을_삭제하면_탈퇴_처리되고_개인정보가_지워진다() throws Exception {
        Member member = signupAndLogin();

        admin(delete("/api/admin/members/" + member.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"))
                .andExpect(jsonPath("$.name").value("탈퇴회원"));

        // 삭제된 회원은 로그인도, 남아 있던 토큰도 쓸 수 없다.
        login(member.username(), PASSWORD).andExpect(status().isUnauthorized());
        me(member.token()).andExpect(status().isUnauthorized());

        // 이미 삭제한 회원은 다시 손댈 수 없다.
        admin(delete("/api/admin/members/" + member.id()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_WITHDRAWN"));

        // 삭제한 회원은 목록에서도 빠진다.
        admin(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username == '" + member.username() + "')]").isEmpty());
    }

    @Test
    void 본인과_관리자_계정은_삭제할_수_없다() throws Exception {
        String body = me(adminToken).andReturn().getResponse().getContentAsString();
        Integer adminId = JsonPath.read(body, "$.id");

        admin(delete("/api/admin/members/" + adminId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_MODIFY_SELF"));

        Member other = signupAndLogin();
        admin(put("/api/admin/members/" + other.id() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk());
        admin(delete("/api/admin/members/" + other.id()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ADMIN_CANNOT_WITHDRAW"));
    }

    @Test
    void 없는_회원이나_잘못된_권한은_거부한다() throws Exception {
        admin(post("/api/admin/members/999999/lock"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
        Member member = signupAndLogin();
        admin(put("/api/admin/members/" + member.id() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"GUEST\"}"))
                .andExpect(status().isBadRequest());
    }

    private Member signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String signup = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                                + "@ballpark.com\",\"password\":\"" + PASSWORD + "\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String login = login(username, PASSWORD).andReturn().getResponse().getContentAsString();
        return new Member(((Number) JsonPath.read(signup, "$.id")).longValue(), username,
                JsonPath.read(login, "$.accessToken"));
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"));
    }

    private ResultActions me(String token) throws Exception {
        return mockMvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, bearer(token)));
    }

    private ResultActions admin(MockHttpServletRequestBuilder request)
            throws Exception {
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private record Member(Long id, String username, String token) {
    }
}
