package com.ballpark.ticketing.member;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileUpdateIntegrationTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 이름과_이메일을_바꾸면_새_값으로_조회된다() throws Exception {
        String username = newUsername();
        String token = signupAndLogin(username, username + "@ballpark.com");

        updateProfile(token, "  새이름  ", username + "-new@BallPark.com", PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("새이름"))
                .andExpect(jsonPath("$.email").value(username + "-new@ballpark.com"))
                .andExpect(jsonPath("$.username").value(username));

        mockMvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("새이름"))
                .andExpect(jsonPath("$.email").value(username + "-new@ballpark.com"));
    }

    @Test
    void 현재_비밀번호가_틀리면_400이고_바뀌지_않는다() throws Exception {
        String username = newUsername();
        String token = signupAndLogin(username, username + "@ballpark.com");

        updateProfile(token, "새이름", username + "-new@ballpark.com", "wrong-password")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));

        mockMvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(jsonPath("$.name").value("야구팬"));
    }

    @Test
    void 다른_회원이_쓰는_이메일로는_바꿀_수_없다() throws Exception {
        String other = newUsername();
        signupAndLogin(other, other + "@ballpark.com");
        String username = newUsername();
        String token = signupAndLogin(username, username + "@ballpark.com");

        updateProfile(token, "야구팬", other + "@ballpark.com", PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
    }

    @Test
    void 내_이메일을_그대로_두고_이름만_바꿔도_된다() throws Exception {
        String username = newUsername();
        String email = username + "@ballpark.com";
        String token = signupAndLogin(username, email);

        updateProfile(token, "이름만변경", email, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("이름만변경"))
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void 이메일_형식이_틀리면_400이다() throws Exception {
        String username = newUsername();
        String token = signupAndLogin(username, username + "@ballpark.com");

        updateProfile(token, "야구팬", "not-an-email", PASSWORD).andExpect(status().isBadRequest());
    }

    @Test
    void 로그인하지_않으면_401이다() throws Exception {
        mockMvc.perform(put("/api/members/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"a\",\"email\":\"a@ballpark.com\",\"currentPassword\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions updateProfile(String token, String name, String email, String currentPassword)
            throws Exception {
        return mockMvc.perform(put("/api/members/me/profile")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"currentPassword\":\""
                        + currentPassword + "\"}"));
    }

    private String signupAndLogin(String username, String email) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + email + "\",\"password\":\""
                                + PASSWORD + "\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD
                                + "\",\"autoLogin\":false}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private static String newUsername() {
        return "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
