package com.ballpark.ticketing.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

/** 같은 예매를 동시에 두 번 취소해도 환불은 한 번만 나가야 한다. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReservationCancelConcurrencyTest {

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
    private PaymentGateway paymentGateway;

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
    void 같은_예매를_동시에_두_번_취소해도_환불은_한_번만_나간다() throws Exception {
        String token = signupAndLogin();
        long reservationId = reserve(token);

        // 첫 번째 취소가 환불을 부르는 동안(커밋 전) 두 번째 취소가 들어오게 만든다.
        CountDownLatch firstRefundStarted = new CountDownLatch(1);
        doAnswer(invocation -> {
            firstRefundStarted.countDown();
            Thread.sleep(300);
            return invocation.callRealMethod();
        }).when(paymentGateway).cancel(anyString(), anyInt());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = pool.submit(() -> cancel(token, reservationId));
            assertThat(firstRefundStarted.await(5, TimeUnit.SECONDS)).isTrue();
            Future<Integer> second = pool.submit(() -> cancel(token, reservationId));

            List<Integer> statuses = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            // 하나만 취소되고, 나머지는 "이미 취소할 수 없는 예매"로 거절된다.
            assertThat(statuses).containsExactlyInAnyOrder(200, 409);
        } finally {
            pool.shutdownNow();
        }

        verify(paymentGateway, times(1)).cancel(anyString(), anyInt());
    }

    private int cancel(String token, long reservationId) throws Exception {
        return mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andReturn().getResponse().getStatus();
    }

    private long reserve(String token) throws Exception {
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":1}";
        mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat + "]}"))
                .andExpect(status().isOk());
        String body = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
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
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }
}
