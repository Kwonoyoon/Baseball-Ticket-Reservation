package com.ballpark.ticketing.reservation;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;

/**
 * 한 회원이 한 경기에서 예매할 수 있는 좌석 수를 관리한다.
 * 좌석 선점 단계와 결제 단계 양쪽에서 확인해, 결제 직전에 막히는 일이 없도록 한다.
 */
@Component
@Transactional(readOnly = true)
public class ReservationQuota {

    private final ReservationSeatRepository reservationSeatRepository;
    private final ReservationProperties properties;

    public ReservationQuota(ReservationSeatRepository reservationSeatRepository, ReservationProperties properties) {
        this.reservationSeatRepository = reservationSeatRepository;
        this.properties = properties;
    }

    public int maxSeatsPerGame() {
        return properties.maxSeatsPerGame();
    }

    /** 회원이 이 경기에서 이미 예매한 좌석 수 (취소분 제외) */
    public int countReservedSeats(Long gameId, Long memberId) {
        if (memberId == null) {
            return 0;
        }
        return (int) reservationSeatRepository.countSeats(gameId, memberId, ReservationStatus.CONFIRMED);
    }

    /** 좌석을 더 담을 수 있는지 확인한다. 한도를 넘으면 남은 수량을 알려주며 거절한다. */
    public void ensureWithinLimit(Long gameId, Long memberId, int additionalSeats) {
        int reserved = countReservedSeats(gameId, memberId);
        int limit = maxSeatsPerGame();
        if (reserved + additionalSeats > limit) {
            throw new BusinessException(ErrorCode.SEAT_LIMIT_EXCEEDED, reserved == 0
                    ? "한 경기에는 최대 " + limit + "석까지 예매할 수 있습니다."
                    : "한 경기에는 최대 " + limit + "석까지 예매할 수 있습니다. "
                            + "이미 " + reserved + "석을 예매하셔서 " + Math.max(0, limit - reserved) + "석만 더 선택할 수 있습니다.");
        }
    }
}
