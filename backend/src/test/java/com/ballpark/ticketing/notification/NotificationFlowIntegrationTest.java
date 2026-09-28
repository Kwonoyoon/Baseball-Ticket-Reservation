package com.ballpark.ticketing.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * 예매·취소 알림은 커밋이 끝난 뒤 새 트랜잭션에서 저장된다.
 * (docs/troubleshooting/notification-transaction-500.md)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationFlowIntegrationTest {

    private static final String PASSWORD = "password123";

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
    private NotificationService notificationService;

    private Game game;
    private SeatSection section;

    @BeforeEach
    void setUp() {
        List<Team> teams = teamRepository.findAllWithStadium();
        Team home = teams.get(0);
        game = gameRepository.save(new Game(home, teams.get(1), home.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        section = seatSectionRepository.findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId())
                .getFirst();
    }

    @Test
    void 예매와_취소가_커밋되면_알림이_저장된다() throws Exception {
        String token = signupAndLogin();
        hold(token).andExpect(status().isOk());
        String body = reserve(token).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long reservationId = ((Number) JsonPath.read(body, "$.id")).longValue();

        mockMvc.perform(post("/api/reservations/" + reservationId + "/cancel")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());

        // 커밋 뒤(afterCommit)에 저장해도 새 트랜잭션이라 실제로 남아 있어야 한다.
        mockMvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].type").value("RESERVATION_CANCELED"))
                .andExpect(jsonPath("$[1].type").value("RESERVATION_CONFIRMED"));
        mockMvc.perform(get("/api/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.count").value(2));
    }

    @Test
    void 알림에서_오류가_나도_결제된_예매는_취소되지_않는다() throws Exception {
        doThrow(new IllegalStateException("알림 저장소 장애"))
                .when(notificationService).create(anyLong(), any(), anyString(), anyString(), any());
        String token = signupAndLogin();
        hold(token).andExpect(status().isOk());

        reserve(token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(get("/api/reservations/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    private String signupAndLogin() throws Exception {
        String username = "fan" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                                + "@ballpark.com\",\"password\":\"" + PASSWORD + "\",\"name\":\"야구팬\"}"))
                .andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private ResultActions hold(String token) throws Exception {
        return mockMvc.perform(post("/api/games/" + game.getId() + "/holds")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"seats\":[" + seat() + "]}"));
    }

    private ResultActions reserve(String token) throws Exception {
        return mockMvc.perform(post("/api/reservations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"gameId\":" + game.getId() + ",\"paymentMethod\":\"CARD\",\"seats\":[" + seat() + "]}"));
    }

    private String seat() {
        return "{\"sectionId\":" + section.getId() + ",\"rowNo\":1,\"seatNo\":1}";
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
