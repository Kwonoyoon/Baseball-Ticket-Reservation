package com.ballpark.ticketing.transfer;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
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
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TicketTransferIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private SeatSectionRepository seatSectionRepository;

    @Autowired
    private Clock clock;

    private Game game;
    private SeatSection section;
    private int nextSeatNo;

    @BeforeEach
    void setUp() {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(0);
        game = gameRepository.save(new Game(home, teams.get(1), home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository
                .findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId()).getFirst();
        nextSeatNo = 1;
    }

    @Test
    void 양도글을_올리고_다른_회원이_사면_예매의_주인이_바뀐다() throws Exception {
        String seller = signupAndLogin();
        String buyer = signupAndLogin();
        long reservationId = reserve(seller);

        String registered = register(seller, reservationId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                // 정가 양도: 가격은 받지 않고 원래 결제 금액 그대로다.
                .andExpect(jsonPath("$.price").value(section.getPrice()))
                .andExpect(jsonPath("$.mine").value(true))
                // 판매자 실명은 가려서 보여 준다. (가입할 때 이름은 "야구팬")
                .andExpect(jsonPath("$.sellerName").value("야**"))
                .andReturn().getResponse().getContentAsString();
        long transferId = ((Number) JsonPath.read(registered, "$.id")).longValue();

        // 다른 회원에게는 목록에 보이지만 내 것이 아니다.
        mockMvc.perform(get("/api/transfers").header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")].mine").value(hasItem(false)));

        buy(buyer, transferId).andExpect(status().isNoContent());

        // 예매는 구매자 것이 되고, 판매자 목록에서는 사라진다. 좌석은 그대로 판매된 상태다.
        mockMvc.perform(get("/api/reservations/" + reservationId).header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
        mockMvc.perform(get("/api/reservations/" + reservationId).header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/games/" + game.getId() + "/seats?sectionId=" + section.getId()))
                .andExpect(jsonPath("$.soldSeats.length()").value(1));

        // 팔린 글은 마켓에서 빠지고, 판매자의 내 양도 목록에는 SOLD로 남는다.
        mockMvc.perform(get("/api/transfers").header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")]").isEmpty());
        mockMvc.perform(get("/api/transfers/me").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")].status").value(hasItem("SOLD")));

        // 이미 팔린 글을 또 사려 하면 막힌다.
        buy(signupAndLogin(), transferId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRANSFER_CLOSED"));

        // 구매자가 취소하면 구매자의 결제가 환불되는 새 소유자 예매로 취급된다.
        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));
    }

    @Test
    void 본인_글은_못_사고_중복_등록은_막히며_남의_예매는_올릴_수_없다() throws Exception {
        String seller = signupAndLogin();
        String other = signupAndLogin();
        long reservationId = reserve(seller);

        // 남의 예매는 존재 여부도 드러내지 않는다.
        register(other, reservationId).andExpect(status().isNotFound());

        long transferId = registerAndGetId(seller, reservationId);
        register(seller, reservationId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_LISTED"));
        buy(seller, transferId)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_BUY_OWN_TICKET"));
        // 남의 양도글은 거둘 수 없다.
        mockMvc.perform(post("/api/transfers/" + transferId + "/cancel").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());
    }

    @Test
    void 양도글이_열려_있으면_예매를_취소할_수_없고_거두면_취소할_수_있다() throws Exception {
        String seller = signupAndLogin();
        long reservationId = reserve(seller);
        long transferId = registerAndGetId(seller, reservationId);

        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRANSFER_LISTED"));

        mockMvc.perform(post("/api/transfers/" + transferId + "/cancel").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isNoContent());
        // 거둔 글은 마켓에서 빠지고, 같은 예매를 다시 올릴 수 있다.
        mockMvc.perform(get("/api/transfers").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")]").isEmpty());
        long relisted = registerAndGetId(seller, reservationId);
        mockMvc.perform(post("/api/transfers/" + relisted + "/cancel").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));
    }

    @Test
    void 구단으로_걸러_보고_경기가_취소되면_열린_양도글도_닫힌다() throws Exception {
        String seller = signupAndLogin();
        long reservationId = reserve(seller);
        long transferId = registerAndGetId(seller, reservationId);

        mockMvc.perform(get("/api/transfers").param("teamId", String.valueOf(game.getHomeTeam().getId()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")]").isNotEmpty());
        // 이 경기와 상관없는 구단으로 보면 안 나온다.
        long unrelatedTeamId = teamRepository.findAll().stream()
                .map(Team::getId)
                .filter(id -> !id.equals(game.getHomeTeam().getId()) && !id.equals(game.getAwayTeam().getId()))
                .findFirst().orElseThrow();
        mockMvc.perform(get("/api/transfers").param("teamId", String.valueOf(unrelatedTeamId))
                        .header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(jsonPath("$[*].id").value(not(hasItem((int) transferId))));

        String admin = JsonPath.read(login("rootadmin", "root-admin-password")
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
        mockMvc.perform(patch("/api/games/" + game.getId() + "/cancel").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/transfers/me").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(jsonPath("$[?(@.id == " + transferId + ")].status").value(hasItem("CANCELED")));
    }

    private long registerAndGetId(String token, long reservationId) throws Exception {
        String body = register(token, reservationId).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions register(String token, long reservationId) throws Exception {
        return mockMvc.perform(post("/api/reservations/" + reservationId + "/transfer")
                .header(HttpHeaders.AUTHORIZATION, bearer(token)));
    }

    private ResultActions buy(String token, long transferId) throws Exception {
        return mockMvc.perform(post("/api/transfers/" + transferId + "/buy")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"CARD\"}"));
    }

    /** 좌석을 하나 선점하고 예매해 예매 id를 돌려준다. 테스트마다 좌석 번호를 바꿔 겹치지 않게 한다. */
    private long reserve(String token) throws Exception {
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":" + nextSeatNo++ + "}";
        mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        String body = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat + "]}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"fan-" + UUID.randomUUID()
                                + "@ballpark.com\",\"password\":\"password123\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        String body = login(username, "password123").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
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
