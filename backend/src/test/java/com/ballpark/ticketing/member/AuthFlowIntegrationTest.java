package com.ballpark.ticketing.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.ballpark.ticketing.support.PaymentTestSupport;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private SeatSectionRepository seatSectionRepository;

    @Autowired
    private Clock clock;

    @Test
    void 로그인하면_리프레시_토큰을_HttpOnly_세션_쿠키로_받는다() throws Exception {
        String username = signup();

        MockHttpServletResponse response = login(username, PASSWORD, false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.expiresIn").value(1800))
                .andExpect(jsonPath("$.member.role").value("MEMBER"))
                .andReturn().getResponse();

        String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie)
                .startsWith(RefreshTokenCookie.NAME + "=")
                .contains("HttpOnly", "SameSite=Strict", "Path=/api/auth")
                .doesNotContain("Max-Age");
    }

    @Test
    void 자동_로그인이면_쿠키를_유효_기간만큼_유지한다() throws Exception {
        String setCookie = login(signup(), PASSWORD, true).andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);

        assertThat(setCookie).contains("Max-Age=604800");
    }

    @Test
    void 리프레시_토큰은_쓸_때마다_교체되고_새_토큰으로_계속_갱신된다() throws Exception {
        Cookie first = refreshCookie(login(signup(), PASSWORD, false));

        MockHttpServletResponse refreshed = refresh(first)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andReturn().getResponse();
        Cookie second = refreshCookie(refreshed);
        assertThat(second.getValue()).isNotEqualTo(first.getValue());
        me(accessToken(refreshed)).andExpect(status().isOk());

        // 여러 탭이 거의 동시에 갱신한 경우: 늦게 온 옛 토큰만 거절하고 로그인은 유지한다.
        refresh(first).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        refresh(second).andExpect(status().isOk());
    }

    @Test
    void 교체된_토큰이_유예_시간_뒤에_다시_쓰이면_그_로그인을_모두_끊는다() throws Exception {
        String username = signup();
        Cookie stolen = refreshCookie(login(username, PASSWORD, false));
        Cookie current = refreshCookie(refresh(stolen).andReturn().getResponse());
        Cookie otherDevice = refreshCookie(login(username, PASSWORD, false));
        // 교체된 지 1분이 지난 것으로 만든다.
        jdbcTemplate.update("update refresh_tokens set revoked_at = ? where revoked_at is not null",
                LocalDateTime.now(clock).minusMinutes(1));

        refresh(stolen).andExpect(status().isUnauthorized());

        refresh(current).andExpect(status().isUnauthorized());
        refresh(otherDevice).andExpect(status().isOk());
    }

    @Test
    void 로그아웃하면_그_리프레시_토큰은_더_쓸_수_없다() throws Exception {
        Cookie cookie = refreshCookie(login(signup(), PASSWORD, true));

        String cleared = mockMvc.perform(post("/api/auth/logout").cookie(cookie))
                .andExpect(status().isNoContent())
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cleared).contains("Max-Age=0");

        refresh(cookie).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void 없는_아이디와_틀린_비밀번호는_같은_오류로_응답한다() throws Exception {
        String username = signup();

        String wrongPassword = login(username, "wrong-password", false)
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String unknownUser = login("nobody" + username, PASSWORD, false)
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(wrongPassword).isEqualTo(unknownUser);
    }

    @Test
    void 비밀번호를_5회_틀리면_계정이_잠기고_기존_로그인도_끊긴다() throws Exception {
        String username = signup();
        MockHttpServletResponse loggedIn = login(username, PASSWORD, false).andReturn().getResponse();
        String accessToken = accessToken(loggedIn);
        Cookie cookie = refreshCookie(loggedIn);

        for (int i = 0; i < 4; i++) {
            login(username, "wrong-password", false)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
        login(username, "wrong-password", false)
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.message").value("비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 관리자에게 문의해 주세요."));

        login(username, PASSWORD, false).andExpect(status().isLocked());
        me(accessToken).andExpect(status().isUnauthorized());
        refresh(cookie).andExpect(status().isUnauthorized());
    }

    @Test
    void 로그인에_성공하면_실패_횟수가_초기화된다() throws Exception {
        String username = signup();
        for (int i = 0; i < 4; i++) {
            login(username, "wrong-password", false).andExpect(status().isUnauthorized());
        }
        login(username, PASSWORD, false).andExpect(status().isOk());

        for (int i = 0; i < 4; i++) {
            login(username, "wrong-password", false).andExpect(status().isUnauthorized());
        }
        login(username, PASSWORD, false).andExpect(status().isOk());
    }

    @Test
    void 비밀번호를_바꾸면_다른_기기는_끊기고_지금_기기는_로그인이_유지된다() throws Exception {
        String username = signup();
        MockHttpServletResponse thisDevice = login(username, PASSWORD, true).andReturn().getResponse();
        MockHttpServletResponse otherDevice = login(username, PASSWORD, false).andReturn().getResponse();

        MockHttpServletResponse changed = mockMvc.perform(put("/api/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken(thisDevice)))
                        .cookie(refreshCookie(thisDevice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"new-password-456\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse();
        // 자동 로그인 여부를 이어받는다.
        assertThat(changed.getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=604800");

        me(accessToken(changed)).andExpect(status().isOk());
        me(accessToken(thisDevice)).andExpect(status().isUnauthorized());
        me(accessToken(otherDevice)).andExpect(status().isUnauthorized());
        refresh(refreshCookie(otherDevice)).andExpect(status().isUnauthorized());
        refresh(refreshCookie(changed)).andExpect(status().isOk());

        login(username, PASSWORD, false).andExpect(status().isUnauthorized());
        login(username, "new-password-456", false).andExpect(status().isOk());
    }

    @Test
    void 현재_비밀번호가_틀리거나_같은_비밀번호로는_바꿀_수_없다() throws Exception {
        String token = accessToken(login(signup(), PASSWORD, false).andReturn().getResponse());

        changePassword(token, "wrong-password", "new-password-456")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));
        changePassword(token, PASSWORD, PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SAME_PASSWORD"));
        changePassword(token, PASSWORD, "short")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        me(token).andExpect(status().isOk());
    }

    @Test
    void 탈퇴하면_로그인할_수_없고_아이디는_다시_쓸_수_없다() throws Exception {
        String username = signup();
        String email = username + "@ballpark.com";
        MockHttpServletResponse loggedIn = login(username, PASSWORD, false).andReturn().getResponse();
        String token = accessToken(loggedIn);

        withdraw(token, "wrong-password")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));
        withdraw(token, PASSWORD).andExpect(status().isNoContent());

        me(token).andExpect(status().isUnauthorized());
        refresh(refreshCookie(loggedIn)).andExpect(status().isUnauthorized());
        login(username, PASSWORD, false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        signup(username, "other-" + email)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_USERNAME"));
        // 이메일은 지워졌으므로 다시 가입할 수 있다.
        signup("re" + username, email).andExpect(status().isCreated());
    }

    @Test
    void 관람_예정인_예매가_있으면_탈퇴할_수_없다() throws Exception {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(0);
        Game game = gameRepository.save(new Game(home, teams.get(1), home.getStadium(),
                LocalDateTime.now(clock).plusDays(2)));
        SeatSection section = seatSectionRepository
                .findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId()).getFirst();
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":1}";
        String token = accessToken(login(signup(), PASSWORD, false).andReturn().getResponse());

        mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        String pending = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat + "]}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String reservation = PaymentTestSupport.payAndConfirm(mockMvc, token, pending);

        withdraw(token, PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("HAS_UPCOMING_RESERVATIONS"));

        Integer reservationId = JsonPath.read(reservation, "$.id");
        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
        withdraw(token, PASSWORD).andExpect(status().isNoContent());
    }

    @Test
    void 비회원은_경기_일정만_볼_수_있다() throws Exception {
        mockMvc.perform(get("/api/teams")).andExpect(status().isOk());
        mockMvc.perform(get("/api/members/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/reservations/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/games/1/holds").contentType(MediaType.APPLICATION_JSON).content("{\"seats\":[]}"))
                .andExpect(status().isUnauthorized());
    }

    private String signup() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        signup(username, username + "@ballpark.com").andExpect(status().isCreated());
        return username;
    }

    private ResultActions signup(String username, String email) throws Exception {
        return mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                        + "\",\"name\":\"야구팬\"}"));
    }

    private ResultActions login(String username, String password, boolean autoLogin) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\",\"autoLogin\":"
                        + autoLogin + "}"));
    }

    private ResultActions refresh(Cookie cookie) throws Exception {
        return mockMvc.perform(post("/api/auth/refresh").cookie(cookie));
    }

    private ResultActions me(String accessToken) throws Exception {
        return mockMvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken)));
    }

    private ResultActions changePassword(String accessToken, String current, String next) throws Exception {
        return mockMvc.perform(put("/api/auth/password")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + next + "\"}"));
    }

    private ResultActions withdraw(String accessToken, String password) throws Exception {
        return mockMvc.perform(post("/api/members/me/withdraw")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + password + "\"}"));
    }

    private static Cookie refreshCookie(ResultActions result) {
        return refreshCookie(result.andReturn().getResponse());
    }

    private static Cookie refreshCookie(MockHttpServletResponse response) {
        String header = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(header).startsWith(RefreshTokenCookie.NAME + "=");
        String value = header.substring(RefreshTokenCookie.NAME.length() + 1, header.indexOf(';'));
        return new Cookie(RefreshTokenCookie.NAME, value);
    }

    private static String accessToken(MockHttpServletResponse response) throws Exception {
        return JsonPath.read(response.getContentAsString(), "$.accessToken");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
