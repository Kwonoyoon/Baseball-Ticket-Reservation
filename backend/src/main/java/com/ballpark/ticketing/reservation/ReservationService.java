package com.ballpark.ticketing.reservation;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.reservation.dto.ReservationRequest;
import com.ballpark.ticketing.reservation.dto.ReservationResponse;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentRequest;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentResult;
import com.ballpark.ticketing.seat.SeatHoldStore;
import com.ballpark.ticketing.seat.SeatPosition;
import com.ballpark.ticketing.seat.SeatService;
import com.ballpark.ticketing.stadium.SeatSection;

@Service
@Transactional(readOnly = true)
public class ReservationService {

    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);
    private static final DateTimeFormatter NUMBER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyMMdd");
    private static final String NUMBER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int NUMBER_RANDOM_LENGTH = 6;

    private final ReservationRepository reservationRepository;
    private final SoldSeatRepository soldSeatRepository;
    private final MemberRepository memberRepository;
    private final SeatService seatService;
    private final SeatHoldStore seatHoldStore;
    private final ReservationQuota reservationQuota;
    private final PaymentGateway paymentGateway;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public ReservationService(ReservationRepository reservationRepository, SoldSeatRepository soldSeatRepository,
            MemberRepository memberRepository, SeatService seatService, SeatHoldStore seatHoldStore,
            ReservationQuota reservationQuota, PaymentGateway paymentGateway, Clock clock) {
        this.reservationRepository = reservationRepository;
        this.soldSeatRepository = soldSeatRepository;
        this.memberRepository = memberRepository;
        this.seatService = seatService;
        this.seatHoldStore = seatHoldStore;
        this.reservationQuota = reservationQuota;
        this.paymentGateway = paymentGateway;
        this.clock = clock;
    }

    /**
     * 예매 순서
     * <ol>
     *   <li>요청 좌석이 모두 본인 선점 상태인지 Redis에서 확인한다.</li>
     *   <li>예매와 판매 좌석을 저장하고 flush 한다. 동시 요청이 있어도 유니크 제약이 중복 판매를 막는다.</li>
     *   <li>좌석 확보에 성공한 뒤에만 결제를 요청한다.</li>
     *   <li>커밋 후 선점을 해제한다. (해제에 실패해도 TTL이 지나면 자동으로 풀린다)</li>
     * </ol>
     */
    @Transactional
    public ReservationResponse reserve(Long memberId, ReservationRequest request) {
        Game game = seatService.findBookableGame(request.gameId());
        Map<SeatPosition, SeatSection> seats = seatService.validateSeats(game, request.seats());

        Map<SeatPosition, Long> owners = seatHoldStore.findOwners(game.getId(), seats.keySet());
        boolean allHeldByMember = seats.keySet().stream().allMatch(seat -> memberId.equals(owners.get(seat)));
        if (!allHeldByMember) {
            throw new BusinessException(ErrorCode.HOLD_EXPIRED);
        }

        // 선점 이후 다른 창에서 예매했을 수 있으므로 결제 직전에 한 번 더 확인한다.
        reservationQuota.ensureWithinLimit(game.getId(), memberId, seats.size());

        LocalDateTime now = LocalDateTime.now(clock);
        Member member = memberRepository.getReferenceById(memberId);
        Reservation reservation = new Reservation(generateReservationNumber(now), member, game,
                request.paymentMethod(), now);
        seats.forEach((seat, section) -> reservation.addSeat(section, seat.rowNo(), seat.seatNo()));
        reservationRepository.save(reservation);

        try {
            soldSeatRepository.saveAllAndFlush(seats.keySet().stream()
                    .map(seat -> new SoldSeat(game.getId(), seat, reservation.getId()))
                    .toList());
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.SEAT_ALREADY_SOLD);
        }

        PaymentResult payment = paymentGateway.pay(new PaymentRequest(memberId,
                reservation.getReservationNumber(), reservation.getTotalPrice(), request.paymentMethod()));
        if (!payment.approved()) {
            throw new BusinessException(ErrorCode.PAYMENT_FAILED,
                    payment.failureReason() == null ? ErrorCode.PAYMENT_FAILED.getMessage() : payment.failureReason());
        }
        reservation.confirm(payment.transactionId());

        releaseHoldsAfterCommit(game.getId(), memberId, seats.keySet());
        return ReservationResponse.from(reservation, now);
    }

    public List<ReservationResponse> getMyReservations(Long memberId) {
        LocalDateTime now = LocalDateTime.now(clock);
        return reservationRepository.findAllByMemberId(memberId).stream()
                .map(reservation -> ReservationResponse.from(reservation, now))
                .toList();
    }

    public ReservationResponse getReservation(Long memberId, Long reservationId) {
        return ReservationResponse.from(findOwnedReservation(memberId, reservationId), LocalDateTime.now(clock));
    }

    @Transactional
    public ReservationResponse cancel(Long memberId, Long reservationId) {
        Reservation reservation = findOwnedReservation(memberId, reservationId);
        LocalDateTime now = LocalDateTime.now(clock);
        reservation.cancel(now);
        soldSeatRepository.deleteByReservationId(reservation.getId());
        paymentGateway.cancel(reservation.getPaymentTransactionId(), reservation.getTotalPrice());
        return ReservationResponse.from(reservation, now);
    }

    /** 다른 회원의 예매는 존재 여부도 드러내지 않도록 404로 응답한다. */
    private Reservation findOwnedReservation(Long memberId, Long reservationId) {
        return reservationRepository.findDetailById(reservationId)
                .filter(reservation -> reservation.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
    }

    private void releaseHoldsAfterCommit(long gameId, long memberId, Set<SeatPosition> seats) {
        Set<SeatPosition> heldSeats = Set.copyOf(seats);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    seatHoldStore.release(gameId, memberId, heldSeats);
                } catch (RuntimeException e) {
                    log.warn("좌석 선점 해제에 실패했습니다. 만료 시간이 지나면 자동 해제됩니다. gameId={}", gameId, e);
                }
            }
        });
    }

    private String generateReservationNumber(LocalDateTime now) {
        StringBuilder number = new StringBuilder("BP").append(now.format(NUMBER_DATE_FORMAT));
        for (int i = 0; i < NUMBER_RANDOM_LENGTH; i++) {
            number.append(NUMBER_CHARS.charAt(random.nextInt(NUMBER_CHARS.length())));
        }
        return number.toString();
    }
}
