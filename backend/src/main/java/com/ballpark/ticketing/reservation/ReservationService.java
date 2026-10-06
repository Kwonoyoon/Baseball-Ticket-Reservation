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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.notification.NotificationService;
import com.ballpark.ticketing.notification.NotificationType;
import com.ballpark.ticketing.notification.ReservationEmailContent;
import com.ballpark.ticketing.reservation.dto.PaymentAbandonResponse;
import com.ballpark.ticketing.reservation.dto.PaymentConfirmRequest;
import com.ballpark.ticketing.reservation.dto.ReservationRequest;
import com.ballpark.ticketing.reservation.dto.ReservationResponse;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentResult;
import com.ballpark.ticketing.seat.SeatHoldStore;
import com.ballpark.ticketing.seat.SeatPosition;
import com.ballpark.ticketing.seat.SeatService;
import com.ballpark.ticketing.stadium.SeatSection;
import com.ballpark.ticketing.transfer.TicketTransferService;

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
    private final NotificationService notificationService;
    private final TicketTransferService ticketTransferService;
    private final ReservationProperties properties;
    private final TransactionTemplate transaction;
    private final TransactionTemplate readTransaction;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public ReservationService(ReservationRepository reservationRepository, SoldSeatRepository soldSeatRepository,
            MemberRepository memberRepository, SeatService seatService, SeatHoldStore seatHoldStore,
            ReservationQuota reservationQuota, PaymentGateway paymentGateway,
            NotificationService notificationService, TicketTransferService ticketTransferService,
            ReservationProperties properties, PlatformTransactionManager transactionManager, Clock clock) {
        this.reservationRepository = reservationRepository;
        this.soldSeatRepository = soldSeatRepository;
        this.memberRepository = memberRepository;
        this.seatService = seatService;
        this.seatHoldStore = seatHoldStore;
        this.reservationQuota = reservationQuota;
        this.paymentGateway = paymentGateway;
        this.notificationService = notificationService;
        this.ticketTransferService = ticketTransferService;
        this.properties = properties;
        this.transaction = new TransactionTemplate(transactionManager);
        this.readTransaction = new TransactionTemplate(transactionManager);
        this.readTransaction.setReadOnly(true);
        this.clock = clock;
    }

    /**
     * 결제 대기 예매를 만든다. (예매 1단계)
     * <ol>
     *   <li>요청 좌석이 모두 본인 선점 상태인지 Redis에서 확인한다.</li>
     *   <li>예매(PENDING)와 판매 좌석을 저장하고 flush 한다. 동시 요청이 있어도 유니크 제약이 중복 판매를 막는다.</li>
     *   <li>커밋 후 선점을 해제한다. 좌석은 이제 판매 좌석으로 잡혀 있다. (해제에 실패해도 TTL이 지나면 자동으로 풀린다)</li>
     * </ol>
     * 돌려준 예매번호(주문번호)·금액으로 결제창을 열고, 결제창에서 인증하면 {@link #confirmPayment}로 확정한다.
     * 결제 시간 안에 확정하지 않으면 정리 작업이 예매를 지우고 좌석을 푼다.
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

        releaseHoldsAfterCommit(game.getId(), memberId, seats.keySet());
        return ReservationResponse.from(reservation, now, reservation.paymentDeadline(properties.paymentTimeLimit()));
    }

    /**
     * 결제창에서 인증을 마친 결제를 승인하고 예매를 확정한다. (예매 2단계)
     * <ol>
     *   <li>주문 확인: 내 결제 대기 예매인지, 결제 시간이 남았는지, 결제창에서 넘어온 금액이 주문 금액과 같은지 본다.
     *       (결제창 쪽 금액은 조작될 수 있으므로 반드시 서버의 주문 금액과 비교한다)</li>
     *   <li>PG 승인: 바깥 시스템 호출이므로 DB 트랜잭션 밖에서 부른다. 잠금을 쥔 채 PG를 기다리지 않는다.</li>
     *   <li>확정: 예매를 잠그고 아직 결제 대기인지 다시 본 뒤 확정한다. 그사이 결제 시간이 지나 정리됐다면
     *       방금 승인된 결제를 환불하고 실패로 돌려준다.</li>
     * </ol>
     * 같은 결제로 다시 요청하면(새로고침 등) 이미 확정된 예매를 그대로 돌려준다.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ReservationResponse confirmPayment(Long memberId, PaymentConfirmRequest request) {
        String orderId = request.orderId();
        String paymentKey = request.paymentKey();

        // 1) 주문 확인
        ReservationResponse alreadyConfirmed = readTransaction.execute(status -> {
            // 결제 시간이 지나 정리된 주문도 여기서 걸린다. (남의 주문번호여도 같은 응답이라 존재 여부가 드러나지 않는다)
            Reservation reservation = reservationRepository.findDetailByReservationNumber(orderId)
                    .filter(found -> found.isOwnedBy(memberId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_EXPIRED));
            if (reservation.getStatus() == ReservationStatus.CONFIRMED
                    && paymentKey.equals(reservation.getPaymentTransactionId())) {
                return ReservationResponse.from(reservation, LocalDateTime.now(clock));
            }
            if (!reservation.isPending() || reservation.isPaymentOverdue(LocalDateTime.now(clock),
                    properties.paymentTimeLimit())) {
                throw new BusinessException(ErrorCode.PAYMENT_EXPIRED);
            }
            if (reservation.getTotalPrice() != request.amount()) {
                throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
            }
            return null;
        });
        if (alreadyConfirmed != null) {
            return alreadyConfirmed;
        }

        // 2) PG 승인 (트랜잭션 밖)
        PaymentResult payment = paymentGateway.confirm(paymentKey, orderId, request.amount());
        if (!payment.approved()) {
            throw new BusinessException(ErrorCode.PAYMENT_FAILED,
                    payment.failureReason() == null ? ErrorCode.PAYMENT_FAILED.getMessage() : payment.failureReason());
        }

        // 3) 확정. 실패하면 방금 승인된 결제를 되돌린다.
        try {
            return transaction.execute(status -> {
                Reservation reservation = reservationRepository.findForUpdateByReservationNumber(orderId)
                        .filter(found -> found.isOwnedBy(memberId))
                        .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_EXPIRED));
                // 같은 결제로 동시에 두 번 요청하면 먼저 끝난 쪽이 이미 확정했다. 성공으로 돌려주고 환불하지 않는다.
                if (reservation.getStatus() == ReservationStatus.CONFIRMED
                        && payment.transactionId().equals(reservation.getPaymentTransactionId())) {
                    return ReservationResponse.from(reservation, LocalDateTime.now(clock));
                }
                reservation.confirm(payment.transactionId());
                notifyAfterCommit(memberId, NotificationType.RESERVATION_CONFIRMED, "예매가 완료되었습니다",
                        reservation.getReservationNumber() + " 예매가 정상적으로 완료되었습니다.",
                        buildEmailContent(reservation));
                return ReservationResponse.from(reservation, LocalDateTime.now(clock));
            });
        } catch (RuntimeException e) {
            refundQuietly(payment.transactionId(), request.amount(), orderId);
            throw e;
        }
    }

    /**
     * 결제창에서 결제를 그만두거나 실패했을 때. 결제 대기 예매를 지우고 좌석을 푼다.
     * 이미 확정됐거나 정리된 예매면 아무것도 하지 않는다. 결제창을 다시 열 수 있도록 경기 ID를 돌려준다.
     */
    @Transactional
    public PaymentAbandonResponse abandonPayment(Long memberId, String orderId) {
        Reservation reservation = reservationRepository.findForUpdateByReservationNumber(orderId)
                .filter(found -> found.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        Long gameId = reservation.getGame().getId();
        if (reservation.isPending()) {
            deletePending(reservation);
        }
        return new PaymentAbandonResponse(gameId);
    }

    /** 결제 시간이 지난 결제 대기 예매를 지우고 좌석을 푼다. 지운 개수를 돌려준다. */
    @Transactional
    public int expireOverduePayments() {
        LocalDateTime before = LocalDateTime.now(clock).minus(properties.paymentTimeLimit());
        List<Reservation> overdue = reservationRepository.findAllForUpdateByStatusCreatedBefore(
                ReservationStatus.PENDING, before);
        overdue.forEach(this::deletePending);
        if (!overdue.isEmpty()) {
            log.info("결제 시간이 지난 결제 대기 예매 {}건을 정리했습니다.", overdue.size());
        }
        return overdue.size();
    }

    /** 예매내역에는 확정·취소된 예매만 보여 준다. (결제 대기는 결제창이 열려 있는 동안의 임시 상태다) */
    public List<ReservationResponse> getMyReservations(Long memberId) {
        LocalDateTime now = LocalDateTime.now(clock);
        return reservationRepository.findAllByMemberId(memberId).stream()
                .filter(reservation -> !reservation.isPending())
                .map(reservation -> ReservationResponse.from(reservation, now))
                .toList();
    }

    public ReservationResponse getReservation(Long memberId, Long reservationId) {
        return ReservationResponse.from(findOwnedReservation(memberId, reservationId), LocalDateTime.now(clock));
    }

    @Transactional
    public ReservationResponse cancel(Long memberId, Long reservationId) {
        // 잠그고 읽는다. 동시에 두 번 취소해도 두 번째는 이미 취소된 예매를 보게 되어 환불이 한 번만 나간다.
        Reservation reservation = reservationRepository.findForUpdateById(reservationId)
                .filter(found -> found.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        LocalDateTime now = LocalDateTime.now(clock);
        // 양도글이 열려 있는 채로 취소되면 남이 이미 취소된 예매를 살 수 있다. 먼저 양도를 거두게 한다.
        ticketTransferService.ensureNotListed(reservation.getId());
        reservation.cancel(now);
        soldSeatRepository.deleteByReservationId(reservation.getId());
        paymentGateway.cancel(reservation.getPaymentTransactionId(), reservation.getTotalPrice());
        notifyAfterCommit(memberId, NotificationType.RESERVATION_CANCELED, "예매가 취소되었습니다",
                reservation.getReservationNumber() + " 예매가 취소되었습니다.", buildEmailContent(reservation));
        return ReservationResponse.from(reservation, now);
    }

    /**
     * 경기가 취소되면(우천취소 등) 그 경기의 확정 예매를 전부 취소·환불하고, 예매자 전원에게 알림·이메일을 보낸다.
     * 게임 취소 트랜잭션(GameService.cancelGame)에 합류해 같이 커밋·롤백된다.
     */
    @Transactional
    public void cancelAllForGame(Game game) {
        LocalDateTime now = LocalDateTime.now(clock);
        ticketTransferService.cancelAllForGame(game.getId());
        // 결제창이 열려 있던 결제 대기 예매는 지운다. (그사이 결제가 승인되면 확정 단계에서 환불된다)
        reservationRepository.findAllForUpdateByGameIdAndStatus(game.getId(), ReservationStatus.PENDING)
                .forEach(this::deletePending);
        // 회원의 개별 취소와 겹쳐도 환불이 두 번 나가지 않게 잠그고 읽는다.
        List<Reservation> reservations = reservationRepository.findAllForUpdateByGameIdAndStatus(game.getId(),
                ReservationStatus.CONFIRMED);
        for (Reservation reservation : reservations) {
            reservation.cancelDueToGameCancellation(now);
            soldSeatRepository.deleteByReservationId(reservation.getId());
            paymentGateway.cancel(reservation.getPaymentTransactionId(), reservation.getTotalPrice());
            notifyAfterCommit(reservation.getMember().getId(), NotificationType.GAME_CANCELED, "경기가 취소되었습니다",
                    reservation.getReservationNumber() + " 경기가 취소되어 예매가 자동으로 취소되고 결제가 환불되었습니다.",
                    buildEmailContent(reservation));
        }
    }

    /**
     * 알림 메일에 쓸 경기·좌석·결제 정보를 미리 뽑아 둔다. afterCommit 콜백은 트랜잭션이 끝난 뒤 실행되어
     * 지연 로딩된 엔티티 필드에 접근할 수 없으므로, 값이 살아 있는 지금(커밋 전)에 문자열/숫자로 옮겨 둔다.
     */
    private ReservationEmailContent buildEmailContent(Reservation reservation) {
        Game game = reservation.getGame();
        List<String> seatLabels = reservation.getSeats().stream()
                .map(seat -> seat.getSection().getName() + " " + seat.getRowNo() + "열 " + seat.getSeatNo() + "번")
                .toList();
        return new ReservationEmailContent(reservation.getId(), reservation.getReservationNumber(),
                game.getHomeTeam().getName(), game.getAwayTeam().getName(), game.getStadium().getName(),
                game.getStartAt(), seatLabels, reservation.getTotalPrice());
    }

    /**
     * 알림은 결제·취소와 무관한 부가 작업이라 커밋이 끝난 뒤에 보낸다. (releaseHoldsAfterCommit과 같은 이유)
     * <ul>
     *   <li>알림에서 무슨 오류가 나도 이미 승인된 결제가 롤백되지 않는다.</li>
     *   <li>예매가 롤백되면 알림도 나가지 않는다. (예전엔 커밋 전에 보내 실패한 예매에도 알림이 갔다)</li>
     * </ul>
     * 자세한 경위: docs/troubleshooting/notification-transaction-500.md
     */
    private void notifyAfterCommit(Long memberId, NotificationType type, String title, String message,
            ReservationEmailContent emailContent) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    notificationService.create(memberId, type, title, message, emailContent);
                } catch (RuntimeException e) {
                    log.warn("알림을 보내지 못했습니다. 예매는 정상 처리됐습니다. memberId={}, type={}", memberId, type, e);
                }
            }
        });
    }

    /** 다른 회원의 예매는 존재 여부도 드러내지 않도록 404로 응답한다. */
    private Reservation findOwnedReservation(Long memberId, Long reservationId) {
        return reservationRepository.findDetailById(reservationId)
                .filter(reservation -> reservation.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
    }

    /** 결제 대기 예매를 지운다. 판매 좌석도 함께 지워 다른 사람이 살 수 있게 된다. */
    private void deletePending(Reservation reservation) {
        soldSeatRepository.deleteByReservationId(reservation.getId());
        reservationRepository.delete(reservation);
    }

    /** 승인 뒤 확정에 실패했을 때 결제를 되돌린다. 환불마저 실패하면 기록만 남긴다(수동 확인 필요). */
    private void refundQuietly(String paymentKey, int amount, String orderId) {
        try {
            paymentGateway.cancel(paymentKey, amount);
        } catch (RuntimeException e) {
            log.error("승인된 결제를 되돌리지 못했습니다. 수동 환불이 필요합니다. orderId={}, paymentKey={}",
                    orderId, paymentKey, e);
        }
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
