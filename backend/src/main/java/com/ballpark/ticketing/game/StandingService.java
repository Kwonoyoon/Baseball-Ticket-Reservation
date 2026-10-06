package com.ballpark.ticketing.game;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.dto.StandingResponse;
import com.ballpark.ticketing.team.Team;
import com.ballpark.ticketing.team.TeamRepository;
import com.ballpark.ticketing.team.dto.TeamResponse;

/** 결과가 입력된(FINISHED) 경기로 순위표를 계산한다. 결과가 하나도 없으면 모든 구단이 0승 0패로 나온다. */
@Service
@Transactional(readOnly = true)
public class StandingService {

    private final GameRepository gameRepository;
    private final TeamRepository teamRepository;

    public StandingService(GameRepository gameRepository, TeamRepository teamRepository) {
        this.gameRepository = gameRepository;
        this.teamRepository = teamRepository;
    }

    public List<StandingResponse> getStandings() {
        List<Team> teams = teamRepository.findAll();
        Map<Long, int[]> record = new HashMap<>(); // [승, 패, 무]
        teams.forEach(team -> record.put(team.getId(), new int[3]));

        for (Game game : gameRepository.findAllFinished()) {
            if (game.getHomeScore() == null || game.getAwayScore() == null) {
                continue;
            }
            int[] home = record.get(game.getHomeTeam().getId());
            int[] away = record.get(game.getAwayTeam().getId());
            if (home == null || away == null) {
                continue;
            }
            if (game.getHomeScore() > game.getAwayScore()) {
                home[0]++;
                away[1]++;
            } else if (game.getHomeScore() < game.getAwayScore()) {
                away[0]++;
                home[1]++;
            } else {
                home[2]++;
                away[2]++;
            }
        }

        List<Team> ranked = new ArrayList<>(teams);
        ranked.sort(Comparator.comparingDouble((Team team) -> -winPct(record.get(team.getId())))
                .thenComparingInt(team -> -record.get(team.getId())[0])
                .thenComparing(Team::getId));

        int[] leader = record.get(ranked.getFirst().getId());
        List<StandingResponse> result = new ArrayList<>();
        for (int i = 0; i < ranked.size(); i++) {
            Team team = ranked.get(i);
            int[] r = record.get(team.getId());
            double behind = ((leader[0] - r[0]) + (r[1] - leader[1])) / 2.0;
            result.add(new StandingResponse(i + 1, TeamResponse.from(team), r[0], r[1], r[2], winPct(r), behind));
        }
        return result;
    }

    private static double winPct(int[] r) {
        int decided = r[0] + r[1];
        return decided == 0 ? 0 : (double) r[0] / decided;
    }
}
