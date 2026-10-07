package com.ballpark.ticketing.home;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
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

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.game.TeamRecord;
import com.ballpark.ticketing.game.TeamRecordRepository;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.support.PaymentTestSupport;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

/** 메인 화면 슬라이드가 쓰는 읽기 전용 요약 API(매진 임박, 순위, 뜨는 글, 최근 양도글)를 로그인 없이 확인한다. */
@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HomeSlidesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private SeatSectionRepository seatSectionRepository;

    @Autowired
    private TeamRecordRepository teamRecordRepository;

    @Autowired
    private Clock clock;

    private Game game;
    private SeatSection section;

    @BeforeEach
    void setUp() {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(2);
        game = gameRepository.save(new Game(home, teams.get(3), home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository.findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId())
                .getFirst();
    }

    @Test
    void 매진_임박은_예매율이_높은_경기가_앞이고_비회원도_본다() throws Exception {
        String fan = signupAndLogin();
        reserve(fan, 1, 1);
        reserve(fan, 1, 2);

        String body = mockMvc.perform(get("/api/games/hot").param("limit", "10"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$[*].game.id");
        List<Double> sold = JsonPath.read(body, "$[*].soldSeats");
        List<Integer> totals = JsonPath.read(body, "$[*].totalSeats");

        // 우리가 좌석을 판 경기가 목록에 있고, 판매 수와 전체 좌석 수가 함께 온다.
        int mine = ids.indexOf(game.getId().intValue());
        assertThat(mine).isGreaterThanOrEqualTo(0);
        assertThat(((Number) sold.get(mine)).intValue()).isEqualTo(2);
        assertThat(totals.get(mine)).isPositive();
        // 예매율(판매÷전체)이 높은 순으로 정렬돼 있다.
        double previous = Double.MAX_VALUE;
        for (int i = 0; i < ids.size(); i++) {
            double ratio = ((Number) sold.get(i)).doubleValue() / totals.get(i);
            assertThat(ratio).isLessThanOrEqualTo(previous);
            previous = ratio;
        }
        // limit 만큼만 준다.
        mockMvc.perform(get("/api/games/hot").param("limit", "1")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 순위표는_공식_성적이_없으면_결과가_입력된_경기로_계산하고_모든_구단이_나온다() throws Exception {
        // 마이그레이션이 넣어 둔 공식 성적이 있으면 그것을 쓰므로, 경기 결과 계산을 보려면 비워야 한다.
        teamRecordRepository.deleteAll();
        String admin = JsonPath.read(login("rootadmin", "root-admin-password")
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
        // 홈팀이 4:1로 이긴 결과를 입력한다.
        mockMvc.perform(patch("/api/games/" + game.getId() + "/result").header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"homeScore\":4,\"awayScore\":1}"))
                .andExpect(status().isOk());

        String body = mockMvc.perform(get("/api/standings")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> ranks = JsonPath.read(body, "$[*].rank");
        assertThat(ranks).isEqualTo(java.util.stream.IntStream.rangeClosed(1, ranks.size()).boxed().toList());
        assertThat(ranks).hasSize(teamRepository.findAll().size());

        long homeId = game.getHomeTeam().getId();
        long awayId = game.getAwayTeam().getId();
        mockMvc.perform(get("/api/standings"))
                .andExpect(jsonPath("$[?(@.team.id == " + homeId + ")].wins").value(hasItem(org.hamcrest.Matchers.greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.team.id == " + awayId + ")].losses").value(hasItem(org.hamcrest.Matchers.greaterThanOrEqualTo(1))));
        // 승률 높은 순이라 승률이 앞에서 뒤로 줄어든다.
        List<Double> pct = JsonPath.read(body, "$[*].winPct");
        for (int i = 1; i < pct.size(); i++) {
            assertThat(pct.get(i)).isLessThanOrEqualTo(pct.get(i - 1));
        }
        // 선두의 승차는 0이다.
        mockMvc.perform(get("/api/standings")).andExpect(jsonPath("$[0].gamesBehind").value(0.0));
    }

    @Test
    void 순위표는_공식_성적이_있으면_그것으로_승률_순에_승차까지_계산한다() throws Exception {
        teamRecordRepository.deleteAll();
        List<Team> teams = teamRepository.findAll();
        // 일부러 id 순서와 다르게 넣는다: 두 번째 구단 10승 0패, 첫 번째 구단 5승 5패, 세 번째 구단 5승 5패 1무
        LocalDate day = LocalDate.of(2026, 10, 6);
        teamRecordRepository.save(new TeamRecord(teams.get(0).getId(), 5, 5, 0, day));
        teamRecordRepository.save(new TeamRecord(teams.get(1).getId(), 10, 0, 0, day));
        teamRecordRepository.save(new TeamRecord(teams.get(2).getId(), 5, 5, 1, day));

        String body = mockMvc.perform(get("/api/standings")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> teamIds = JsonPath.read(body, "$[*].team.id");
        // 1위는 10승 0패. 같은 승률(5승 5패)이면 승수가 같으니 id가 작은 구단이 앞이다.
        assertThat(teamIds.get(0)).isEqualTo(teams.get(1).getId().intValue());
        assertThat(teamIds.get(1)).isEqualTo(teams.get(0).getId().intValue());
        assertThat(teamIds.get(2)).isEqualTo(teams.get(2).getId().intValue());
        // 첫 구단: 승차 ((10-5)+(5-0))/2 = 5. 공식 성적이 없는 나머지 구단은 0승 0패다.
        mockMvc.perform(get("/api/standings"))
                .andExpect(jsonPath("$[1].gamesBehind").value(5.0))
                .andExpect(jsonPath("$[2].draws").value(1))
                .andExpect(jsonPath("$[3].wins").value(0));
    }

    @Test
    void 지금_뜨는_글은_구단을_가리지_않고_좋아요_많은_순이다() throws Exception {
        String author = signupAndLogin();
        String fan = signupAndLogin();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        long teamA = teamRepository.findAll().get(0).getId();
        long teamB = teamRepository.findAll().get(1).getId();
        long few = createPost(author, teamA, "적게-" + tag);
        long many = createPost(author, teamB, "많이-" + tag);
        like(fan, few);
        like(fan, many);
        like(author, many);

        String body = mockMvc.perform(get("/api/community/hot-posts").param("limit", "10"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$[*].id");
        assertThat(ids).contains((int) many, (int) few);
        assertThat(ids.indexOf((int) many)).isLessThan(ids.indexOf((int) few));
        // 어느 구단 게시판의 글인지 함께 온다.
        mockMvc.perform(get("/api/community/hot-posts").param("limit", "10"))
                .andExpect(jsonPath("$[?(@.id == " + many + ")].team.id").value(hasItem((int) teamB)));
    }

    @Test
    void 최근_양도글은_비회원도_보고_판매자_정보는_없다() throws Exception {
        String seller = signupAndLogin();
        long reservationId = reserve(seller, 2, 1);
        long transferId = ((Number) JsonPath.read(mockMvc.perform(post("/api/reservations/" + reservationId + "/transfer")
                        .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id")).longValue();

        String body = mockMvc.perform(get("/api/transfers/recent").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")].price").value(hasItem(section.getPrice())))
                .andReturn().getResponse().getContentAsString();
        // 판매자 이름·예매번호 같은 값은 응답에 없다.
        assertThat(body).doesNotContain("sellerName").doesNotContain("reservationNumber");
    }

    private long reserve(String token, int row, int seatNo) throws Exception {
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":" + row + ",\"seatNo\":" + seatNo + "}";
        mockMvc.perform(post("/api/games/" + game.getId() + "/holds").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        String pending = mockMvc.perform(post("/api/reservations").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat + "]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        // 결제는 2단계(결제 대기 → 결제창 승인 → 확정)라서, 확정까지 거쳐야 양도할 수 있는 예매가 된다.
        String confirmed = PaymentTestSupport.payAndConfirm(mockMvc, token, pending);
        return ((Number) JsonPath.read(confirmed, "$.id")).longValue();
    }

    private long createPost(String token, long teamId, String title) throws Exception {
        String body = mockMvc.perform(post("/api/teams/" + teamId + "/posts").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\":\"FREE\",\"title\":\"" + title + "\",\"content\":\"내용\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private void like(String token, long postId) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/like").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
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
