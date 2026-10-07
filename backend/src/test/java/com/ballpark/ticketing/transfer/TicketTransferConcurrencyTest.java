package com.ballpark.ticketing.transfer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
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
import org.springframework.test.web.servlet.MockMvc;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.support.PaymentTestSupport;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * 양도 마켓의 "한 번에 한 명만 성공한다"를 실제로 동시에 요청해서 확인한다.
 * 순차 호출 테스트(TicketTransferIntegrationTest)는 락이 없어도 통과하므로, 이 방어선(행 잠금, 유니크 인덱스)은
 * 여러 스레드가 같은 순간에 부딪히는 이 테스트로만 확인할 수 있다.
 */
@SpringBootTest(properties = {
        "ticketing.admin.username=RootAdmin",
        "ticketing.admin.password=root-admin-password",
        // 락을 기다리는 시간을 MySQL(InnoDB 기본 50초)에 가깝게 늘린다. H2 기본은 2초라서, 100명이 한 행의 잠금을
        // 순서대로 기다리면 뒤 사람들이 "이미 닫힘(409)"을 보기 전에 시간 초과(500)가 난다. DB 이름을 따로 줘서 다른 테스트에는 영향이 없다.
        "spring.datasource.url=jdbc:h2:mem:ticketing-concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=60000",
        // 구매 트랜잭션은 연결을 하나 잡은 채로, 가짜 PG(REQUIRES_NEW)가 두 번째 연결을 또 요청한다. 기본 풀(10개)에서는
        // 락을 기다리는 구매자 10명이 연결을 다 잡아서 이긴 사람이 결제용 연결을 못 얻고 30초씩 막힌다.(실제로 이 테스트가 찾아낸 문제)
        // 여기서는 "한 명만 성공한다"만 따로 확인하려고 풀을 넉넉히 키우고, 풀 고갈은 후속 개선 과제로 남긴다.
        "spring.datasource.hikari.maximum-pool-size=150"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TicketTransferConcurrencyTest {

    private static final int BUYERS = 100;
    private static final int DUPLICATE_REGISTERS = 20;
    /** 가입·로그인은 BCrypt 때문에 느려서 준비 단계만 병렬로 한다. */
    private static final int SETUP_THREADS = 8;
    private static final long TIMEOUT_SECONDS = 120;

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

    @BeforeEach
    void setUp() {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(4);
        game = gameRepository.save(new Game(home, teams.get(5), home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository.findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId())
                .getFirst();
    }

    @Test
    void 구매자_100명이_같은_양도글을_동시에_사도_한_명만_성공한다() throws Exception {
        String seller = signupAndLogin();
        long reservationId = reserve(seller, 1);
        long transferId = registerAndGetId(seller, reservationId);
        List<String> buyers = inParallel(BUYERS, i -> signupAndLogin());

        List<Result> results = inParallelAtOnce(buyers, buyer -> {
            var response = mockMvc.perform(post("/api/transfers/" + transferId + "/buy")
                            .header(HttpHeaders.AUTHORIZATION, bearer(buyer))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"paymentMethod\":\"CARD\"}"))
                    .andReturn().getResponse();
            return new Result(buyer, response.getStatus(), response.getContentAsString());
        });

        // 성공은 정확히 한 명. 나머지 99명은 "이미 닫힌 글"(409)이어야 하고, 500이 하나라도 있으면 잠금이 새는 것이다.
        List<Result> winners = results.stream().filter(r -> r.status == 204).toList();
        assertThat(winners).hasSize(1);
        List<Result> losers = results.stream().filter(r -> r.status != 204).toList();
        assertThat(losers).hasSize(BUYERS - 1);
        assertThat(losers).allSatisfy(r -> {
            assertThat(r.status).as("응답 본문: %s", r.body).isEqualTo(409);
            assertThat((String) JsonPath.read(r.body, "$.code")).isEqualTo("TRANSFER_CLOSED");
        });

        // 예매의 주인은 이긴 사람 한 명이고 판매자는 더 못 본다. 좌석은 중복 판매되지 않고 그대로 1석이다.
        String winner = winners.getFirst().token;
        mockMvc.perform(get("/api/reservations/" + reservationId).header(HttpHeaders.AUTHORIZATION, bearer(winner)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/reservations/" + reservationId).header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/games/" + game.getId() + "/seats?sectionId=" + section.getId()))
                .andExpect(jsonPath("$.soldSeats.length()").value(1));
        // 진 사람 중 누구도 이 예매를 갖지 못했다.
        for (Result loser : losers) {
            mockMvc.perform(get("/api/reservations/" + reservationId)
                            .header(HttpHeaders.AUTHORIZATION, bearer(loser.token)))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void 같은_예매를_동시에_여러_번_올려도_열린_양도글은_하나만_생긴다() throws Exception {
        String seller = signupAndLogin();
        long reservationId = reserve(seller, 2);

        List<Result> results = inParallelAtOnce(java.util.Collections.nCopies(DUPLICATE_REGISTERS, seller), token -> {
            var response = mockMvc.perform(post("/api/reservations/" + reservationId + "/transfer")
                            .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andReturn().getResponse();
            return new Result(token, response.getStatus(), response.getContentAsString());
        });

        // 등록 성공(201)은 한 번뿐이고, 나머지는 "이미 올라와 있음"(409)이다. 유니크 인덱스가 막는다.
        assertThat(results.stream().filter(r -> r.status == 201)).hasSize(1);
        assertThat(results.stream().filter(r -> r.status != 201)).hasSize(DUPLICATE_REGISTERS - 1)
                .allSatisfy(r -> {
                    assertThat(r.status).as("응답 본문: %s", r.body).isEqualTo(409);
                    assertThat((String) JsonPath.read(r.body, "$.code")).isEqualTo("ALREADY_LISTED");
                });
        // 내 양도 목록에도 이 예매의 열린 글이 하나만 있다.
        String mine = mockMvc.perform(get("/api/transfers/me").header(HttpHeaders.AUTHORIZATION, bearer(seller)))
                .andReturn().getResponse().getContentAsString();
        List<String> open = JsonPath.read(mine, "$[?(@.status == 'OPEN')].status");
        assertThat(open).hasSize(1);
    }

    private record Result(String token, int status, String body) {
    }

    /** 0..count-1 번째 작업을 SETUP_THREADS 개 스레드로 나눠 실행하고 결과를 순서대로 모은다. */
    private <T> List<T> inParallel(int count, ThrowingFunction<Integer, T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(SETUP_THREADS);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                int index = i;
                futures.add(pool.submit(() -> task.apply(index)));
            }
            List<T> out = new ArrayList<>();
            for (Future<T> future : futures) {
                out.add(future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            }
            return out;
        } finally {
            pool.shutdownNow();
        }
    }

    /**
     * 모든 스레드가 준비될 때까지 기다렸다가 같은 순간에 출발시킨다.
     * 스레드를 순서대로 띄우기만 하면 앞 요청이 끝난 뒤에 뒤 요청이 시작돼서 겹치지 않는다.
     */
    private <I, T> List<T> inParallelAtOnce(List<I> inputs, ThrowingFunction<I, T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(inputs.size());
        CountDownLatch ready = new CountDownLatch(inputs.size());
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (I input : inputs) {
                Callable<T> call = () -> {
                    ready.countDown();
                    go.await();
                    return task.apply(input);
                };
                futures.add(pool.submit(call));
            }
            assertThat(ready.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)).as("모든 스레드가 준비돼야 한다").isTrue();
            go.countDown();
            List<T> out = new ArrayList<>();
            for (Future<T> future : futures) {
                out.add(future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            }
            return out;
        } finally {
            pool.shutdownNow();
        }
    }

    @FunctionalInterface
    private interface ThrowingFunction<I, T> {
        T apply(I input) throws Exception;
    }

    private long registerAndGetId(String token, long reservationId) throws Exception {
        String body = mockMvc.perform(post("/api/reservations/" + reservationId + "/transfer")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    /** 좌석 하나를 선점하고 예매해 예매 id를 돌려준다. 테스트마다 좌석 번호를 다르게 줘서 겹치지 않게 한다. */
    private long reserve(String token, int seatNo) throws Exception {
        String seat = "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":" + seatNo + "}";
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
        String body = PaymentTestSupport.payAndConfirm(mockMvc, token, pending);
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

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
