package com.ballpark.ticketing.seat;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.reservation.SoldSeatRepository;
import com.ballpark.ticketing.seat.dto.HoldResponse;
import com.ballpark.ticketing.seat.dto.SeatStatusResponse;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;

@Service
@Transactional(readOnly = true)
public class SeatService {

    private final GameRepository gameRepository;
    private final SeatSectionRepository seatSectionRepository;
    private final SoldSeatRepository soldSeatRepository;
    private final SeatHoldStore seatHoldStore;
    private final SeatHoldProperties properties;
    private final Clock clock;

    public SeatService(GameRepository gameRepository, SeatSectionRepository seatSectionRepository,
            SoldSeatRepository soldSeatRepository, SeatHoldStore seatHoldStore, SeatHoldProperties properties,
            Clock clock) {
        this.gameRepository = gameRepository;
        this.seatSectionRepository = seatSectionRepository;
        this.soldSeatRepository = soldSeatRepository;
        this.seatHoldStore = seatHoldStore;
        this.properties = properties;
        this.clock = clock;
    }

    public SeatStatusResponse getSeatStatus(Long gameId, Long memberId) {
        if (!gameRepository.existsById(gameId)) {
            throw new BusinessException(ErrorCode.GAME_NOT_FOUND);
        }
        List<String> sold = soldSeatRepository.findByGameId(gameId).stream()
                .map(soldSeat -> soldSeat.toPosition().key())
                .toList();
        List<String> held = new ArrayList<>();
        List<String> mine = new ArrayList<>();
        seatHoldStore.findHolds(gameId).forEach((seat, owner) -> {
            if (owner.equals(memberId)) {
                mine.add(seat.key());
            } else {
                held.add(seat.key());
            }
        });
        return new SeatStatusResponse(sold, held, mine);
    }

    /**
     * 요청한 좌석 묶음을 회원의 선택으로 선점한다. 이전에 선점했지만 이번 요청에 없는 좌석은 해제한다.
     */
    public HoldResponse hold(Long gameId, Long memberId, List<SeatPosition> seats) {
        Game game = findBookableGame(gameId);
        Set<SeatPosition> requested = validateSeats(game, seats).keySet();

        Set<String> soldKeys = soldSeatRepository.findByGameId(gameId).stream()
                .map(soldSeat -> soldSeat.toPosition().key())
                .collect(Collectors.toSet());
        if (requested.stream().anyMatch(seat -> soldKeys.contains(seat.key()))) {
            throw new BusinessException(ErrorCode.SEAT_ALREADY_SOLD);
        }

        Set<SeatPosition> previous = heldBy(gameId, memberId);
        if (!seatHoldStore.holdAll(gameId, memberId, requested, properties.ttl())) {
            throw new BusinessException(ErrorCode.SEAT_ALREADY_HELD);
        }
        previous.removeAll(requested);
        if (!previous.isEmpty()) {
            seatHoldStore.release(gameId, memberId, previous);
        }

        return new HoldResponse(requested.stream().map(SeatPosition::key).toList(),
                clock.instant().plus(properties.ttl()));
    }

    public void releaseAll(Long gameId, Long memberId) {
        Set<SeatPosition> mine = heldBy(gameId, memberId);
        if (!mine.isEmpty()) {
            seatHoldStore.release(gameId, memberId, mine);
        }
    }

    public Game findBookableGame(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND));
        if (!game.isBookable(LocalDateTime.now(clock))) {
            throw new BusinessException(ErrorCode.BOOKING_CLOSED);
        }
        return game;
    }

    /**
     * 좌석 수 제한, 중복, 구장 좌석 범위를 검증하고 요청 순서대로 좌석별 구역을 돌려준다.
     */
    public Map<SeatPosition, SeatSection> validateSeats(Game game, List<SeatPosition> seats) {
        if (seats == null || seats.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "좌석을 선택해 주세요.");
        }
        if (new HashSet<>(seats).size() != seats.size()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "같은 좌석이 중복으로 선택되었습니다.");
        }
        if (seats.size() > properties.maxSeats()) {
            throw new BusinessException(ErrorCode.SEAT_LIMIT_EXCEEDED,
                    "한 번에 최대 " + properties.maxSeats() + "석까지 선택할 수 있습니다.");
        }

        Map<Long, SeatSection> sections = seatSectionRepository
                .findByStadiumIdOrderByDisplayOrder(game.getStadium().getId()).stream()
                .collect(Collectors.toMap(SeatSection::getId, Function.identity()));

        Map<SeatPosition, SeatSection> result = new LinkedHashMap<>();
        for (SeatPosition seat : seats) {
            SeatSection section = sections.get(seat.sectionId());
            if (section == null || !section.contains(seat.rowNo(), seat.seatNo())) {
                throw new BusinessException(ErrorCode.INVALID_SEAT);
            }
            result.put(seat, section);
        }
        return result;
    }

    private Set<SeatPosition> heldBy(Long gameId, Long memberId) {
        Set<SeatPosition> mine = new HashSet<>();
        seatHoldStore.findHolds(gameId).forEach((seat, owner) -> {
            if (owner.equals(memberId)) {
                mine.add(seat);
            }
        });
        return mine;
    }
}
