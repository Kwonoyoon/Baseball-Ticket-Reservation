package com.ballpark.ticketing.reservation;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReservationFlowIntegrationTest {

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
        Team home = teams.get(0);
        Team away = teams.get(1);
        game = gameRepository.save(new Game(home, away, home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository.findByStadiumIdOrderByDisplayOrder(home.getStadium().getId()).getFirst();
    }

    @Test
    void 좌석_선점부터_예매와_취소까지_진행한다() throws Exception {
        String alice = signupAndLogin();
        String bob = signupAndLogin();
        String seatKey = section.getId() + "-1-1";

        hold(alice, seat(1, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seats[0]").value(seatKey))
                .andExpect(jsonPath("$.expiresAt").exists());

        hold(bob, seat(1, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_ALREADY_HELD"));

        mockMvc.perform(get(seatsUrl()).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(jsonPath("$.heldSeats[0]").value(seatKey))
                .andExpect(jsonPath("$.myHeldSeats").isEmpty());

        reserve(bob, seat(1, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("HOLD_EXPIRED"));

        String body = reserve(alice, seat(1, 1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.totalPrice").value(section.getPrice()))
                .andExpect(jsonPath("$.cancelable").value(true))
                .andExpect(jsonPath("$.seats[0].sectionName").value(section.getName()))
                .andReturn().getResponse().getContentAsString();
        long reservationId = ((Number) JsonPath.read(body, "$.id")).longValue();

        mockMvc.perform(get(seatsUrl()))
                .andExpect(jsonPath("$.soldSeats[0]").value(seatKey))
                .andExpect(jsonPath("$.heldSeats").isEmpty());

        hold(bob, seat(1, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_ALREADY_SOLD"));

        mockMvc.perform(get("/api/reservations/me").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(reservationId));

        mockMvc.perform(get("/api/reservations/" + reservationId).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"))
                .andExpect(jsonPath("$.cancelable").value(false));

        mockMvc.perform(get(seatsUrl()))
                .andExpect(jsonPath("$.soldSeats").isEmpty());

        hold(bob, seat(1, 1)).andExpect(status().isOk());
    }

    @Test
    void 좌석을_다시_선택하면_이전_선점은_해제된다() throws Exception {
        String alice = signupAndLogin();

        hold(alice, seat(2, 1)).andExpect(status().isOk());
        hold(alice, seat(2, 2)).andExpect(status().isOk());

        mockMvc.perform(get(seatsUrl()).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(jsonPath("$.myHeldSeats.length()").value(1))
                .andExpect(jsonPath("$.myHeldSeats[0]").value(section.getId() + "-2-2"));

        mockMvc.perform(delete(holdsUrl()).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(seatsUrl()).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(jsonPath("$.myHeldSeats").isEmpty());
    }

    @Test
    void 로그인하지_않으면_좌석을_선점할_수_없다() throws Exception {
        mockMvc.perform(post(holdsUrl())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[" + seat(1, 1) + "]}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 최대_좌석_수를_넘거나_없는_좌석이면_선점할_수_없다() throws Exception {
        String alice = signupAndLogin();
        String fiveSeats = IntStream.rangeClosed(1, 5)
                .mapToObj(n -> seat(3, n))
                .collect(Collectors.joining(","));

        hold(alice, fiveSeats)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SEAT_LIMIT_EXCEEDED"));

        hold(alice, seat(section.getSeatRows() + 1, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SEAT"));
    }

    @Test
    void 구역별_잔여석_요약을_조회한다() throws Exception {
        String alice = signupAndLogin();
        int totalSeats = section.getSeatRows() * section.getSeatsPerRow();
        String sectionPath = "$.sections[?(@.sectionId == " + section.getId() + ")]";

        mockMvc.perform(get(summaryUrl()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections.length()").value(6))
                .andExpect(jsonPath(sectionPath + ".totalSeats").value(hasItem(totalSeats)))
                .andExpect(jsonPath(sectionPath + ".availableSeats").value(hasItem(totalSeats)))
                .andExpect(jsonPath("$.myHeldSeats").isEmpty());

        String twoSeats = seat(section.getSeatRows(), 9) + "," + seat(section.getSeatRows(), 10);
        hold(alice, twoSeats).andExpect(status().isOk());

        mockMvc.perform(get(summaryUrl()).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(jsonPath(sectionPath + ".heldSeats").value(hasItem(2)))
                .andExpect(jsonPath(sectionPath + ".availableSeats").value(hasItem(totalSeats - 2)))
                .andExpect(jsonPath("$.myHeldSeats.length()").value(2));

        reserve(alice, twoSeats).andExpect(status().isCreated());

        mockMvc.perform(get(summaryUrl()))
                .andExpect(jsonPath(sectionPath + ".soldSeats").value(hasItem(2)))
                .andExpect(jsonPath(sectionPath + ".heldSeats").value(hasItem(0)))
                .andExpect(jsonPath(sectionPath + ".availableSeats").value(hasItem(totalSeats - 2)));
    }

    @Test
    void 좌석_목록은_구역을_지정해야_조회할_수_있다() throws Exception {
        mockMvc.perform(get("/api/games/" + game.getId() + "/seats"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        mockMvc.perform(get("/api/games/" + game.getId() + "/seats?sectionId=999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SECTION_NOT_FOUND"));
    }

    @Test
    void 날짜별_경기_일정과_좌석_구성을_조회한다() throws Exception {
        mockMvc.perform(get("/api/games").param("date", game.getStartAt().toLocalDate().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(game.getId().intValue())));

        mockMvc.perform(get("/api/games/" + game.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stadium.name").exists())
                .andExpect(jsonPath("$.sections.length()").value(6));

        mockMvc.perform(get("/api/games/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GAME_NOT_FOUND"));
    }

    @Test
    void 중복_이메일과_잘못된_비밀번호를_거부한다() throws Exception {
        String email = "dup-" + UUID.randomUUID() + "@ballpark.com";
        signup(email).andExpect(status().isCreated());
        signup(email)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    private String signupAndLogin() throws Exception {
        String email = "fan-" + UUID.randomUUID() + "@ballpark.com";
        signup(email).andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private ResultActions signup(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"password123\",\"name\":\"야구팬\"}"));
    }

    private ResultActions hold(String token, String seatsJson) throws Exception {
        return mockMvc.perform(post(holdsUrl())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"seats\":[" + seatsJson + "]}"));
    }

    private ResultActions reserve(String token, String seatsJson) throws Exception {
        return mockMvc.perform(post("/api/reservations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seatsJson + "]}"));
    }

    private String seat(int rowNo, int seatNo) {
        return "{\"sectionId\":" + section.getId() + ",\"rowNo\":" + rowNo + ",\"seatNo\":" + seatNo + "}";
    }

    /** 좌석 목록은 구역 단위로만 조회한다. */
    private String seatsUrl() {
        return "/api/games/" + game.getId() + "/seats?sectionId=" + section.getId();
    }

    private String summaryUrl() {
        return "/api/games/" + game.getId() + "/seats/summary";
    }

    private String holdsUrl() {
        return "/api/games/" + game.getId() + "/holds";
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
