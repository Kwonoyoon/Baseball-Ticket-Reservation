package com.ballpark.ticketing.seat;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
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
import com.ballpark.ticketing.reservation.ReservationQuota;
import com.ballpark.ticketing.reservation.SoldSeatRepository;
import com.ballpark.ticketing.reservation.SoldSeatRepository.SectionSoldCount;
import com.ballpark.ticketing.seat.dto.HoldResponse;
import com.ballpark.ticketing.seat.dto.SeatStatusResponse;
import com.ballpark.ticketing.seat.dto.SeatSummaryResponse;
import com.ballpark.ticketing.seat.dto.SeatSummaryResponse.SectionAvailability;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.stadium.SeatSectionRepository;

/**
 * 좌석 현황 조회와 선점을 담당한다.
 *
 * <p>한 구장은 2만 석이 넘기 때문에 조회는 모두 구역 단위로 처리한다.
 * 구장 화면에는 좌석 목록 대신 구역별 개수만 내려보내고, 좌석 목록은 사용자가 고른 구역만 조회한다.
 */
@Service
@Transactional(readOnly = true)
public class SeatService {

    private final GameRepository gameRepository;
    private final SeatSectionRepository seatSectionRepository;
    private final SoldSeatRepository soldSeatRepository;
    private final SeatHoldStore seatHoldStore;
    private final SeatHoldProperties properties;
    private final ReservationQuota reservationQuota;
    private final Clock clock;

    public SeatService(GameRepository gameRepository, SeatSectionRepository seatSectionRepository,
            SoldSeatRepository soldSeatRepository, SeatHoldStore seatHoldStore, SeatHoldProperties properties,
            ReservationQuota reservationQuota, Clock clock) {
        this.gameRepository = gameRepository;
        this.seatSectionRepository = seatSectionRepository;
        this.soldSeatRepository = soldSeatRepository;
        this.seatHoldStore = seatHoldStore;
        this.properties = properties;
        this.reservationQuota = reservationQuota;
        this.clock = clock;
    }

    /** 구역 하나의 판매/선점 좌석 목록. */
    public SeatStatusResponse getSectionSeatStatus(Long gameId, Long sectionId, Long memberId) {
        Game game = findGame(gameId);
        SeatSection section = findSection(game, sectionId);

        List<String> sold = soldSeatRepository.findByGameIdAndSectionId(gameId, section.getId()).stream()
                .map(soldSeat -> soldSeat.toPosition().key())
                .sorted()
                .toList();

        List<String> held = new ArrayList<>();
        List<String> mine = new ArrayList<>();
        seatHoldStore.findHoldsBySection(gameId, section.getId()).forEach((seat, owner) -> {
            if (owner.equals(memberId)) {
                mine.add(seat.key());
            } else {
                held.add(seat.key());
            }
        });
        Collections.sort(held);
        Collections.sort(mine);

        return new SeatStatusResponse(section.getId(), sold, held, mine);
    }

    /** 구장 화면용 구역별 잔여석 요약과 회원의 예매 한도. 좌석 목록은 읽지 않는다. */
    public SeatSummaryResponse getSeatSummary(Long gameId, Long memberId) {
        Game game = findGame(gameId);
        List<SeatSection> sections = findSections(game);

        Map<Long, Long> soldCounts = soldSeatRepository.countSoldBySection(gameId).stream()
                .collect(Collectors.toMap(SectionSoldCount::getSectionId, SectionSoldCount::getSoldCount));
        Map<Long, Integer> heldCounts = seatHoldStore.countHoldsBySection(gameId,
                sections.stream().map(SeatSection::getId).toList());

        List<SectionAvailability> availabilities = sections.stream()
                .map(section -> SectionAvailability.of(
                        section.getId(),
                        section.getSeatRows() * section.getSeatsPerRow(),
                        soldCounts.getOrDefault(section.getId(), 0L).intValue(),
                        heldCounts.getOrDefault(section.getId(), 0)))
                .toList();

        List<String> myHeldSeats = memberId == null ? List.of()
                : seatHoldStore.findHoldsByMember(gameId, memberId).stream()
                        .map(SeatPosition::key)
                        .sorted()
                        .toList();

        return new SeatSummaryResponse(availabilities, myHeldSeats,
                reservationQuota.countReservedSeats(gameId, memberId), reservationQuota.maxSeatsPerGame());
    }

    /**
     * 요청한 좌석 묶음을 회원의 선택으로 선점한다. 이전에 선점했지만 이번 요청에 없는 좌석은 해제한다.
     */
    public HoldResponse hold(Long gameId, Long memberId, List<SeatPosition> seats) {
        Game game = findBookableGame(gameId);
        Set<SeatPosition> requested = validateSeats(game, seats).keySet();

        // 결제 단계에서 막히지 않도록 선점 단계에서 1인 예매 한도를 먼저 확인한다.
        reservationQuota.ensureWithinLimit(gameId, memberId, requested.size());

        // 요청한 좌석만 확인한다. 경기 전체 판매 좌석을 읽지 않는다.
        for (SeatPosition seat : requested) {
            boolean sold = soldSeatRepository.existsByGameIdAndSectionIdAndRowNoAndSeatNo(
                    gameId, seat.sectionId(), seat.rowNo(), seat.seatNo());
            if (sold) {
                throw new BusinessException(ErrorCode.SEAT_ALREADY_SOLD);
            }
        }

        Set<SeatPosition> previous = seatHoldStore.findHoldsByMember(gameId, memberId);
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
        Set<SeatPosition> mine = seatHoldStore.findHoldsByMember(gameId, memberId);
        if (!mine.isEmpty()) {
            seatHoldStore.release(gameId, memberId, mine);
        }
    }

    public Game findBookableGame(Long gameId) {
        Game game = findGame(gameId);
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

        Map<Long, SeatSection> sections = findSections(game).stream()
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

    private Game findGame(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND));
    }

    private List<SeatSection> findSections(Game game) {
        return seatSectionRepository.findByStadiumIdAndActiveTrueOrderByDisplayOrder(game.getStadium().getId());
    }

    private SeatSection findSection(Game game, Long sectionId) {
        return findSections(game).stream()
                .filter(section -> section.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.SECTION_NOT_FOUND));
    }
}
