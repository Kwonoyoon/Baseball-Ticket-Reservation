package com.ballpark.ticketing.community;

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
                .andExpect(jsonPath("$[0].targetPreview").value("삭제될 글"));

        mockMvc.perform(get("/api/admin/community/reports").header(HttpHeaders.AUTHORIZATION, bearer(author)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/community/posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/posts/" + postId)).andExpect(status().isNotFound());
    }

    private Long createPost(String token, String title, String content) throws Exception {
        String body = mockMvc.perform(post("/api/teams/" + TEAM_ID + "/posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"content\":\"" + content + "\"}"))
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
