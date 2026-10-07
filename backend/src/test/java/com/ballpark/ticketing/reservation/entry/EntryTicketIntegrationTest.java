package com.ballpark.ticketing.reservation.entry;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import com.ballpark.ticketing.support.PaymentTestSupport;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "ticketing.admin.username=GateAdmin",
        "ticketing.admin.password=gate-admin-password"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EntryTicketIntegrationTest {

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

    private Team home;
    private Team away;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        List<Team> teams = teamRepository.findAllWithStadium();
        home = teams.get(0);
        away = teams.get(1);
        adminToken = JsonPath.read(login("gateadmin", "gate-admin-password")
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void 입장_시간이면_서버가_서명한_QR로_입장_확인된다() throws Exception {
        // 30분 뒤 시작하는 경기는 평일·주말 모두 이미 입장 시간이다.
        Game game = newGame(LocalDateTime.now(clock).plusMinutes(30));
        String alice = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);

        String body = issue(alice, reservationId)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.expiresInSeconds").value(30))
                .andExpect(jsonPath("$.gameStartsAt").exists())
                .andExpect(jsonPath("$.entryOpensAt").exists())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.token");

        verify(adminToken, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admitted").value(true))
                .andExpect(jsonPath("$.result").value("ADMITTED"))
                .andExpect(jsonPath("$.reservation.id").value(reservationId))
                .andExpect(jsonPath("$.reservation.seats.length()").value(1));
    }

    @Test
    void 입장_시간_전이거나_고친_QR이면_입장시키지_않는다() throws Exception {
        Game game = newGame(LocalDateTime.now(clock).plusDays(1));
        String alice = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);
        String token = JsonPath.read(issue(alice, reservationId).andReturn().getResponse().getContentAsString(),
                "$.token");

        verify(adminToken, token)
                .andExpect(jsonPath("$.admitted").value(false))
                .andExpect(jsonPath("$.result").value("NOT_YET_OPEN"))
                .andExpect(jsonPath("$.entryOpensAt").exists());

        String[] parts = token.split("\\.");
        verify(adminToken, parts[0] + "." + parts[1] + "." + new StringBuilder(parts[2]).reverse())
                .andExpect(jsonPath("$.admitted").value(false))
                .andExpect(jsonPath("$.result").value("INVALID_TOKEN"))
                .andExpect(jsonPath("$.reservation").doesNotExist());
    }

    @Test
    void 경기가_취소되면_QR을_주지_않고_검증도_거부한다() throws Exception {
        Game game = newGame(LocalDateTime.now(clock).plusMinutes(30));
        String alice = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);
        String token = JsonPath.read(issue(alice, reservationId).andReturn().getResponse().getContentAsString(),
                "$.token");

        mockMvc.perform(patch("/api/games/" + game.getId() + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());

        verify(adminToken, token)
                .andExpect(jsonPath("$.admitted").value(false))
                .andExpect(jsonPath("$.result").value("GAME_CANCELED"));
        // 경기 취소로 예매도 자동 취소되어, 더는 입장 QR을 받을 수 없다.
        issue(alice, reservationId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ENTRY_TICKET_UNAVAILABLE"));
    }

    @Test
    void 남의_예매로는_QR을_받을_수_없고_검증은_관리자만_한다() throws Exception {
        Game game = newGame(LocalDateTime.now(clock).plusMinutes(30));
        String alice = signupAndLogin();
        String bob = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);

        issue(bob, reservationId)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_FOUND"));
        String token = JsonPath.read(issue(alice, reservationId).andReturn().getResponse().getContentAsString(),
                "$.token");
        verify(bob, token).andExpect(status().isForbidden());
    }

    private Game newGame(LocalDateTime startAt) {
        return gameRepository.save(new Game(home, away, home.getStadium(), startAt));
    }

    /** 좌석 하나를 선점하고 결제까지 마쳐 확정된 예매 번호를 돌려준다. */
    private long reserveAndPay(String token, Game game) throws Exception {
        SeatSection section = seatSectionRepository
                .findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId()).getFirst();
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":1}";
        mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        String pending = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat
                                + "]}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String confirmed = PaymentTestSupport.payAndConfirm(mockMvc, token, pending);
        return ((Number) JsonPath.read(confirmed, "$.id")).longValue();
    }

    private ResultActions issue(String token, long reservationId) throws Exception {
        return mockMvc.perform(post("/api/reservations/" + reservationId + "/entry-ticket")
                .header(HttpHeaders.AUTHORIZATION, bearer(token)));
    }

    private ResultActions verify(String token, String entryToken) throws Exception {
        return mockMvc.perform(post("/api/admin/entry/verify")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + entryToken + "\"}"));
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"fan-" + UUID.randomUUID()
                                + "@ballpark.com\",\"password\":\"password123\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        return JsonPath.read(login(username, "password123")
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
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
