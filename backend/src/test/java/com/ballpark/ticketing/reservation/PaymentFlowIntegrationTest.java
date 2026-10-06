package com.ballpark.ticketing.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.mockpg.MockPaymentRepository;
import com.ballpark.ticketing.mockpg.MockPaymentStatus;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.support.PaymentTestSupport;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

/** 예매 결제 2단계: 결제 대기 예매 → 가짜 PG 결제창 → 승인·확정 / 이탈 / 시간 초과 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private SeatSectionRepository seatSectionRepository;

    @Autowired
    private MockPaymentRepository mockPaymentRepository;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Clock clock;

    private Game game;
    private SeatSection section;

    @BeforeEach
    void setUp() {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(0);
        game = gameRepository.save(new Game(home, teams.get(1), home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository
                .findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId()).getFirst();
    }

    @Test
    void 결제창에서_승인하면_확정되고_같은_결제로_다시_요청해도_그대로다() throws Exception {
        String token = signupAndLogin();
        String pending = holdAndReserve(token);
        String orderId = JsonPath.read(pending, "$.reservationNumber");
        int amount = JsonPath.read(pending, "$.totalPrice");

        // 결제 대기 예매는 예매내역에 보이지 않지만 좌석은 이미 판매 좌석으로 잡혀 있다.
        mockMvc.perform(get("/api/reservations/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get(seatsUrl())).andExpect(jsonPath("$.soldSeats.length()").value(1));

        String paymentKey = PaymentTestSupport.checkout(mockMvc, token, orderId, amount);
        // 결제창 인증만으로는 돈이 빠져나가지 않는다.
        assertThat(paymentStatus(paymentKey)).isEqualTo(MockPaymentStatus.READY);

        PaymentTestSupport.confirm(mockMvc, token, paymentKey, orderId, amount)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
        assertThat(paymentStatus(paymentKey)).isEqualTo(MockPaymentStatus.DONE);

        // 성공 페이지를 새로고침해 같은 결제로 다시 요청해도 실패하거나 두 번 결제되지 않는다.
        PaymentTestSupport.confirm(mockMvc, token, paymentKey, orderId, amount)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
        mockMvc.perform(get("/api/reservations/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));

        // 취소하면 가짜 PG에서도 환불된다.
        long reservationId = ((Number) JsonPath.read(pending, "$.id")).longValue();
        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
        assertThat(paymentStatus(paymentKey)).isEqualTo(MockPaymentStatus.CANCELED);
    }

    @Test
    void 결제창_금액을_바꿔_보내면_확정하지_않고_PG에도_승인을_요청하지_않는다() throws Exception {
        String token = signupAndLogin();
        String pending = holdAndReserve(token);
        String orderId = JsonPath.read(pending, "$.reservationNumber");

        // 결제창에 1원으로 조작한 금액을 넘겨 인증받았다.
        String paymentKey = PaymentTestSupport.checkout(mockMvc, token, orderId, 1);
        PaymentTestSupport.confirm(mockMvc, token, paymentKey, orderId, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PAYMENT_AMOUNT_MISMATCH"));

        assertThat(paymentStatus(paymentKey)).isEqualTo(MockPaymentStatus.READY);
    }

    @Test
    void 결제창에서_거절되면_결제_키가_없고_결제를_그만두면_좌석이_풀린다() throws Exception {
        String token = signupAndLogin();
        String pending = holdAndReserve(token);
        String orderId = JsonPath.read(pending, "$.reservationNumber");
        int amount = JsonPath.read(pending, "$.totalPrice");

        mockMvc.perform(post("/api/mock-pg/checkout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\":\"" + orderId + "\",\"orderName\":\"테스트\",\"amount\":" + amount
                                + ",\"method\":\"CARD\",\"cardCompany\":\"테스트카드\",\"installmentMonths\":0,"
                                + "\"testOutcome\":\"REJECT_LIMIT_EXCEEDED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("REJECT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.message").value("카드 한도가 초과되었습니다."));

        abandon(token, orderId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value(game.getId()));
        mockMvc.perform(get(seatsUrl())).andExpect(jsonPath("$.soldSeats").isEmpty());
        // 이미 정리된 주문으로 결제를 확정하려 하면 시간 초과로 안내한다.
        PaymentTestSupport.confirm(mockMvc, token, "mpk_unknown", orderId, amount)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAYMENT_EXPIRED"));
        // 한 번 더 그만둬도 문제없다.
        abandon(token, orderId).andExpect(status().isNotFound());
    }

    @Test
    void 결제_시간이_지나면_확정되지_않고_정리_작업이_좌석을_푼다() throws Exception {
        String token = signupAndLogin();
        String pending = holdAndReserve(token);
        String orderId = JsonPath.read(pending, "$.reservationNumber");
        int amount = JsonPath.read(pending, "$.totalPrice");
        String paymentKey = PaymentTestSupport.checkout(mockMvc, token, orderId, amount);

        // 결제 대기 예매를 11분 전에 만든 것처럼 돌린다. (결제 시간 10분)
        jdbcTemplate.update("UPDATE reservations SET created_at = ? WHERE reservation_number = ?",
                LocalDateTime.now(clock).minusMinutes(11), orderId);

        PaymentTestSupport.confirm(mockMvc, token, paymentKey, orderId, amount)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAYMENT_EXPIRED"));
        // 확정 전에 걸러졌으므로 PG에 승인을 요청하지 않았다. (돈이 빠져나가지 않았다)
        assertThat(paymentStatus(paymentKey)).isEqualTo(MockPaymentStatus.READY);

        assertThat(reservationService.expireOverduePayments()).isGreaterThanOrEqualTo(1);
        mockMvc.perform(get(seatsUrl())).andExpect(jsonPath("$.soldSeats").isEmpty());
    }

    @Test
    void 남의_주문은_확정하거나_그만둘_수_없다() throws Exception {
        String owner = signupAndLogin();
        String other = signupAndLogin();
        String pending = holdAndReserve(owner);
        String orderId = JsonPath.read(pending, "$.reservationNumber");
        int amount = JsonPath.read(pending, "$.totalPrice");
        String paymentKey = PaymentTestSupport.checkout(mockMvc, owner, orderId, amount);

        PaymentTestSupport.confirm(mockMvc, other, paymentKey, orderId, amount)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAYMENT_EXPIRED"));
        abandon(other, orderId).andExpect(status().isNotFound());
        mockMvc.perform(get(seatsUrl())).andExpect(jsonPath("$.soldSeats.length()").value(1));
    }

    private String holdAndReserve(String token) throws Exception {
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":1}";
        mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        return mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat + "]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
    }

    private ResultActions abandon(String token, String orderId) throws Exception {
        return mockMvc.perform(post("/api/reservations/abandon")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"orderId\":\"" + orderId + "\"}"));
    }

    private MockPaymentStatus paymentStatus(String paymentKey) {
        return mockPaymentRepository.findByPaymentKey(paymentKey).orElseThrow().getStatus();
    }

    private String seatsUrl() {
        return "/api/games/" + game.getId() + "/seats?sectionId=" + section.getId();
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"fan-" + UUID.randomUUID()
                                + "@ballpark.com\",\"password\":\"password123\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
