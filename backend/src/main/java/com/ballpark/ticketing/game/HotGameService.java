package com.ballpark.ticketing.game;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.game.dto.HotGameResponse;
import com.ballpark.ticketing.reservation.SoldSeatRepository;
import com.ballpark.ticketing.reservation.SoldSeatRepository.GameSoldCount;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;

/**
 * 메인 화면 "매진 임박": 앞으로 일주일 안의 경기 중 예매율이 높은 순.
 * 경기마다 좌석 요약을 따로 부르면 요청이 많아지므로, 경기·구장 전체를 한꺼번에 집계한다.
 */
@Service
@Transactional(readOnly = true)
public class HotGameService {

    /** 이 기간 안에 열리는 경기만 본다. 너무 먼 경기는 예매율이 낮아 "임박"과 어울리지 않는다. */
    private static final int LOOKAHEAD_DAYS = 7;
    private static final int MAX_LIMIT = 10;

    private final GameRepository gameRepository;
    private final SoldSeatRepository soldSeatRepository;
    private final SeatSectionRepository seatSectionRepository;
    private final Clock clock;

    public HotGameService(GameRepository gameRepository, SoldSeatRepository soldSeatRepository,
            SeatSectionRepository seatSectionRepository, Clock clock) {
        this.gameRepository = gameRepository;
        this.soldSeatRepository = soldSeatRepository;
        this.seatSectionRepository = seatSectionRepository;
        this.clock = clock;
    }

    public List<HotGameResponse> getHotGames(int limit) {
        int size = Math.min(Math.max(limit, 1), MAX_LIMIT);
        LocalDateTime now = LocalDateTime.now(clock);
        List<Game> games = gameRepository.findSchedule(now, now.plusDays(LOOKAHEAD_DAYS)).stream()
                .filter(game -> game.getStatus() == GameStatus.SCHEDULED)
                .toList();
        if (games.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> soldByGame = soldSeatRepository
                .countSoldByGames(games.stream().map(Game::getId).toList()).stream()
                .collect(Collectors.toMap(GameSoldCount::getGameId, GameSoldCount::getSoldCount));
        Map<Long, Integer> capacityByStadium = seatSectionRepository
                .findByStadiumIdInAndActiveTrue(games.stream().map(game -> game.getStadium().getId()).distinct().toList())
                .stream()
                .collect(Collectors.groupingBy(section -> section.getStadium().getId(),
                        Collectors.summingInt(HotGameService::capacityOf)));

        return games.stream()
                .map(game -> new HotGameResponse(GameSummaryResponse.from(game),
                        soldByGame.getOrDefault(game.getId(), 0L).intValue(),
                        capacityByStadium.getOrDefault(game.getStadium().getId(), 0)))
                // 좌석 정보가 없는 구장은 비율을 낼 수 없어 뺀다.
                .filter(hot -> hot.totalSeats() > 0)
                .sorted(Comparator.comparingDouble((HotGameResponse hot) -> -ratio(hot))
                        .thenComparing(hot -> hot.game().startAt()))
                .limit(size)
                .toList();
    }

    private static int capacityOf(SeatSection section) {
        return section.getSeatRows() * section.getSeatsPerRow();
    }

    private static double ratio(HotGameResponse hot) {
        return (double) hot.soldSeats() / hot.totalSeats();
    }
}
