package com.ballpark.ticketing.stadium;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;

/** 구장마다 좌석 배치도(블록)가 다르고, 구장 코드로 프론트 배치도와 이어진다. (V18) */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StadiumMapIntegrationTest {

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

    @Test
    void 모든_구장에_배치도_코드가_있고_구장마다_블록이_다르다() {
        Map<String, Team> homeByStadium = homeTeamsByStadiumCode();

        assertThat(homeByStadium).containsOnlyKeys(
                "JAMSIL", "GOCHEOK", "MUNHAK", "SUWON", "DAEJEON", "DAEGU", "GWANGJU", "CHANGWON", "SAJIK");
        // 잠실은 기존 블록 그대로, 나머지는 구장별 블록이라 블록 수가 서로 다르다.
        assertThat(activeSectionCount(homeByStadium.get("JAMSIL"))).isEqualTo(53);
        assertThat(activeSectionCount(homeByStadium.get("GOCHEOK"))).isEqualTo(46);
        assertThat(activeSectionCount(homeByStadium.get("SAJIK"))).isEqualTo(38);
    }

    @Test
    void 경기_상세에_구장_코드와_그_구장의_블록이_온다() throws Exception {
        Map<String, Team> homeByStadium = homeTeamsByStadiumCode();
        Team jamsilHome = homeByStadium.get("JAMSIL");
        Team gocheokHome = homeByStadium.get("GOCHEOK");

        Game jamsil = gameRepository.save(
                new Game(jamsilHome, gocheokHome, jamsilHome.getStadium(), LocalDateTime.now(clock).plusDays(1)));
        Game gocheok = gameRepository.save(
                new Game(gocheokHome, jamsilHome, gocheokHome.getStadium(), LocalDateTime.now(clock).plusDays(1)));

        mockMvc.perform(get("/api/games/" + jamsil.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stadium.code").value("JAMSIL"))
                .andExpect(jsonPath("$.sections[*].code").value(hasItem("NAVY-01")));

        mockMvc.perform(get("/api/games/" + gocheok.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stadium.code").value("GOCHEOK"))
                .andExpect(jsonPath("$.sections.length()").value(46))
                .andExpect(jsonPath("$.sections[*].code").value(everyItem(notNullValue())))
                .andExpect(jsonPath("$.sections[*].code").value(hasItem("DIAMOND-01")))
                .andExpect(jsonPath("$.sections[*].code").value(not(hasItem("NAVY-01"))))
                .andExpect(jsonPath("$.sections[*].name").value(hasItem("다이아몬드석 1번")))
                .andExpect(jsonPath("$.sections[*].grade").value(hasItem("CHEER")));
    }

    private Map<String, Team> homeTeamsByStadiumCode() {
        return teamRepository.findAllWithStadium().stream()
                .collect(Collectors.toMap(team -> team.getStadium().getCode(), Function.identity(), (a, b) -> a));
    }

    private int activeSectionCount(Team home) {
        return seatSectionRepository.findByStadiumIdAndActiveTrueOrderByDisplayOrder(home.getStadium().getId()).size();
    }
}
