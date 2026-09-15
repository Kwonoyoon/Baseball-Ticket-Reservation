package com.ballpark.ticketing.game;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.config.CacheNames;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;

/**
 * 오늘부터 설정된 기간 동안의 샘플 경기를 만든다. 이미 경기가 있는 날짜는 건너뛰므로 재시작해도 중복 생성되지 않는다.
 * KBO처럼 월요일은 휴식일로 두고, 라운드 로빈 방식으로 매일 대진을 바꾼다.
 */
@Component
@ConditionalOnProperty(prefix = "ticketing.sample-data", name = "enabled", havingValue = "true")
public class SampleGameGenerator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleGameGenerator.class);

    private final TeamRepository teamRepository;
    private final GameRepository gameRepository;
    private final SampleDataProperties properties;
    private final CacheManager cacheManager;
    private final Clock clock;

    public SampleGameGenerator(TeamRepository teamRepository, GameRepository gameRepository,
            SampleDataProperties properties, CacheManager cacheManager, Clock clock) {
        this.teamRepository = teamRepository;
        this.gameRepository = gameRepository;
        this.properties = properties;
        this.cacheManager = cacheManager;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Team> teams = teamRepository.findAllWithStadium();
        if (teams.size() < 2 || teams.size() % 2 != 0) {
            log.warn("샘플 경기를 만들려면 짝수 개의 구단이 필요합니다. (현재 {}개)", teams.size());
            return;
        }

        LocalDate today = LocalDate.now(clock);
        int created = 0;
        for (int offset = 0; offset < properties.days(); offset++) {
            LocalDate date = today.plusDays(offset);
            boolean hasGames = gameRepository.existsByStartAtGreaterThanEqualAndStartAtLessThan(
                    date.atStartOfDay(), date.plusDays(1).atStartOfDay());
            if (date.getDayOfWeek() == DayOfWeek.MONDAY || hasGames) {
                continue;
            }
            List<Game> games = createMatchups(teams, date);
            gameRepository.saveAll(games);
            created += games.size();
        }

        if (created > 0) {
            Optional.ofNullable(cacheManager.getCache(CacheNames.GAME_SCHEDULE)).ifPresent(Cache::clear);
            log.info("샘플 경기 {}건을 생성했습니다.", created);
        }
    }

    static List<Game> createMatchups(List<Team> teams, LocalDate date) {
        int teamCount = teams.size();
        int round = Math.floorMod(date.toEpochDay(), teamCount - 1);

        List<Team> rotating = new ArrayList<>(teams.subList(1, teamCount));
        Collections.rotate(rotating, round);
        List<Team> order = new ArrayList<>(teamCount);
        order.add(teams.getFirst());
        order.addAll(rotating);

        Set<Long> usedStadiums = new HashSet<>();
        List<Game> games = new ArrayList<>(teamCount / 2);
        for (int i = 0; i < teamCount / 2; i++) {
            Team home = order.get(i);
            Team away = order.get(teamCount - 1 - i);
            if ((date.toEpochDay() + i) % 2 == 1) {
                Team swap = home;
                home = away;
                away = swap;
            }
            // 잠실처럼 두 구단이 같은 구장을 쓰는 경우 같은 날 중복 사용을 피한다.
            if (usedStadiums.contains(home.getStadium().getId())) {
                Team swap = home;
                home = away;
                away = swap;
            }
            usedStadiums.add(home.getStadium().getId());
            games.add(new Game(home, away, home.getStadium(), date.atTime(startTime(date))));
        }
        return games;
    }

    private static LocalTime startTime(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case SATURDAY -> LocalTime.of(17, 0);
            case SUNDAY -> LocalTime.of(14, 0);
            default -> LocalTime.of(18, 30);
        };
    }
}
