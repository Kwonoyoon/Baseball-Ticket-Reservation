package com.ballpark.ticketing.game;

import java.time.LocalDate;
import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.dto.GameDetailResponse;
import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.global.config.CacheNames;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.stadium.SeatSectionRepository;
import com.ballpark.ticketing.stadium.dto.SeatSectionResponse;

/**
 * 경기 일정과 구장 좌석 구성은 자주 바뀌지 않으므로 캐시한다.
 * 실시간으로 변하는 좌석 판매/선점 현황은 {@code SeatService}에서 캐시 없이 조회한다.
 */
@Service
@Transactional(readOnly = true)
public class GameService {

    private final GameRepository gameRepository;
    private final SeatSectionRepository seatSectionRepository;

    public GameService(GameRepository gameRepository, SeatSectionRepository seatSectionRepository) {
        this.gameRepository = gameRepository;
        this.seatSectionRepository = seatSectionRepository;
    }

    @Cacheable(cacheNames = CacheNames.GAME_SCHEDULE,
            key = "#date.toString() + ':' + (#teamId == null ? 'all' : #teamId)")
    public List<GameSummaryResponse> getSchedule(LocalDate date, Long teamId) {
        return gameRepository.findSchedule(date.atStartOfDay(), date.plusDays(1).atStartOfDay()).stream()
                .filter(game -> teamId == null || game.involves(teamId))
                .map(GameSummaryResponse::from)
                .toList();
    }

    @Cacheable(cacheNames = CacheNames.GAME_DETAIL, key = "#gameId")
    public GameDetailResponse getGame(Long gameId) {
        Game game = gameRepository.findWithTeamsById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND));
        List<SeatSectionResponse> sections = seatSectionRepository
                .findByStadiumIdOrderByDisplayOrder(game.getStadium().getId()).stream()
                .map(SeatSectionResponse::from)
                .toList();
        return GameDetailResponse.of(game, sections);
    }
}
