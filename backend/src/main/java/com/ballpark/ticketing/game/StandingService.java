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

/**
 * 순위표를 만든다. KBO 공식 성적(team_records)이 있으면 그것을 쓰고, 하나도 없으면 결과가 입력된(FINISHED) 경기로 계산한다.
 * 이 사이트의 경기는 샘플이라 계산만으로는 실제 순위가 나오지 않아서 공식 성적을 우선한다.
 * 어느 쪽도 없으면 모든 구단이 0승 0패로 나온다.
 */
@Service
@Transactional(readOnly = true)
public class StandingService {

    private final GameRepository gameRepository;
    private final TeamRepository teamRepository;
    private final TeamRecordRepository teamRecordRepository;

    public StandingService(GameRepository gameRepository, TeamRepository teamRepository,
            TeamRecordRepository teamRecordRepository) {
        this.gameRepository = gameRepository;
        this.teamRepository = teamRepository;
        this.teamRecordRepository = teamRecordRepository;
    }

    public List<StandingResponse> getStandings() {
        List<Team> teams = teamRepository.findAll();
        Map<Long, int[]> record = new HashMap<>(); // [승, 패, 무]
        teams.forEach(team -> record.put(team.getId(), new int[3]));

        List<TeamRecord> official = teamRecordRepository.findAll();
        if (official.isEmpty()) {
            addFinishedGames(record);
        } else {
            for (TeamRecord r : official) {
                int[] mine = record.get(r.getTeamId());
                if (mine != null) {
                    mine[0] = r.getWins();
                    mine[1] = r.getLosses();
                    mine[2] = r.getDraws();
                }
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

    private void addFinishedGames(Map<Long, int[]> record) {
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
    }

    private static double winPct(int[] r) {
        int decided = r[0] + r[1];
        return decided == 0 ? 0 : (double) r[0] / decided;
    }
}
