package com.ballpark.ticketing.reservation.entry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
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

    @MockitoSpyBean
    private EntryPolicy entryPolicy;

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
                .andExpect(jsonPath("$.reservation.seats.length()").value(1))
                .andExpect(jsonPath("$.enteredAt").exists());
    }

    @Test
    void 한_번_입장한_예매는_새_QR로도_다시_입장할_수_없고_취소_양도도_막힌다() throws Exception {
        Game game = newGame(LocalDateTime.now(clock).plusMinutes(30));
        String alice = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);

        String first = verify(adminToken, issueToken(alice, reservationId))
                .andExpect(jsonPath("$.result").value("ADMITTED"))
                .andReturn().getResponse().getContentAsString();
        String enteredAt = JsonPath.read(first, "$.enteredAt");

        // 내 티켓 화면은 30초마다 새 QR을 받지만, 새 QR이어도 같은 예매라 재입장할 수 없다.
        verify(adminToken, issueToken(alice, reservationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admitted").value(false))
                .andExpect(jsonPath("$.result").value("ALREADY_ENTERED"))
                .andExpect(jsonPath("$.enteredAt").value(enteredAt))
                .andExpect(jsonPath("$.reservation.id").value(reservationId))
                .andExpect(jsonPath("$.reservation.cancelable").value(false));

        // 경기 시작 전이어도 입장한 뒤에는 환불받거나 남에게 넘길 수 없다.
        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_CANCELABLE"));
        mockMvc.perform(post("/api/reservations/" + reservationId + "/transfer")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRANSFER_NOT_ALLOWED"));
    }

    @Test
    void 같은_예매의_QR을_두_게이트에서_동시에_읽어도_한_곳만_입장_확인된다() throws Exception {
        Game game = newGame(LocalDateTime.now(clock).plusMinutes(30));
        String alice = signupAndLogin();
        long reservationId = reserveAndPay(alice, game);
        // 캡처해 친구에게 보낸 QR처럼, 두 사람이 서로 다른 QR(같은 예매)을 동시에 내민다.
        String gateA = issueToken(alice, reservationId);
        String gateB = issueToken(alice, reservationId);

        // 첫 번째 게이트가 예매를 잠그고 판단하는 동안(커밋 전) 두 번째 게이트가 들어오게 만든다.
        CountDownLatch firstJudging = new CountDownLatch(1);
        doAnswer(invocation -> {
            if (firstJudging.getCount() > 0) {
                firstJudging.countDown();
                Thread.sleep(300);
            }
            return invocation.callRealMethod();
        }).when(entryPolicy).isOver(any(), any());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<String> first = pool.submit(() -> verifyResult(gateA));
            assertThat(firstJudging.await(5, TimeUnit.SECONDS)).isTrue();
            Future<String> second = pool.submit(() -> verifyResult(gateB));

            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("ADMITTED", "ALREADY_ENTERED");
        } finally {
            pool.shutdownNow();
        }
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

    private String issueToken(String token, long reservationId) throws Exception {
        return JsonPath.read(issue(token, reservationId)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.token");
    }

    private String verifyResult(String entryToken) throws Exception {
        return JsonPath.read(verify(adminToken, entryToken)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.result");
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
