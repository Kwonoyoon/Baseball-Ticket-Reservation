package com.ballpark.ticketing.transfer;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.notification.NotificationService;
import com.ballpark.ticketing.notification.NotificationType;
import com.ballpark.ticketing.notification.ReservationEmailContent;
import com.ballpark.ticketing.reservation.Reservation;
import com.ballpark.ticketing.reservation.ReservationQuota;
import com.ballpark.ticketing.reservation.ReservationRepository;
import com.ballpark.ticketing.reservation.ReservationStatus;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentRequest;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentResult;
import com.ballpark.ticketing.reservation.payment.PaymentMethod;
import com.ballpark.ticketing.transfer.TransferPriority.Window;
import com.ballpark.ticketing.transfer.dto.RecentTransferResponse;
import com.ballpark.ticketing.transfer.dto.TransferResponse;

/**
 * 정가 양도 마켓. 예매 한 건을 통째로 올리고 사 간다.
 * 좌석(sold_seats)과 예매번호는 그대로 두고, 예매의 소유자와 결제 정보만 구매자로 옮긴다.
 * 그래서 중복 판매 방어선과 예매 상태값은 건드리지 않으며, 캘린더·통계도 CONFIRMED 기준 그대로 동작한다.
 *
 * <p>같은 경기를 기다리던 대기자에게는 우선 구매 시간이 있다. (규칙은 {@link TransferPriority})
 */
@Service
@Transactional(readOnly = true)
public class TicketTransferService {

    private static final Logger log = LoggerFactory.getLogger(TicketTransferService.class);
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final TicketTransferRepository transferRepository;
    private final TransferWaitRepository waitRepository;
    private final ReservationRepository reservationRepository;
    private final MemberRepository memberRepository;
    private final ReservationQuota reservationQuota;
    private final PaymentGateway paymentGateway;
    private final NotificationService notificationService;
    private final TransferWaitService waitService;
    private final Clock clock;

    public TicketTransferService(TicketTransferRepository transferRepository, TransferWaitRepository waitRepository,
            ReservationRepository reservationRepository, MemberRepository memberRepository,
            ReservationQuota reservationQuota, PaymentGateway paymentGateway,
            NotificationService notificationService, TransferWaitService waitService, Clock clock) {
        this.waitService = waitService;
        this.transferRepository = transferRepository;
        this.waitRepository = waitRepository;
        this.reservationRepository = reservationRepository;
        this.memberRepository = memberRepository;
        this.reservationQuota = reservationQuota;
        this.paymentGateway = paymentGateway;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    public List<TransferResponse> listOpen(Long viewerId, Long teamId) {
        return toResponses(transferRepository.findOpen(LocalDateTime.now(clock), teamId), viewerId);
    }

    /** 메인 화면용: 최근에 올라온 양도글 몇 개. 판매자 정보 없이 경기·가격·좌석만 담아 비회원에게도 보여 준다. */
    public List<RecentTransferResponse> listRecent(int limit) {
        int size = Math.min(Math.max(limit, 1), 10);
        return transferRepository.findRecentOpen(LocalDateTime.now(clock), PageRequest.of(0, size)).stream()
                .map(RecentTransferResponse::from)
                .toList();
    }

    public List<TransferResponse> listMine(Long sellerId) {
        return toResponses(transferRepository.findAllBySellerId(sellerId), sellerId);
    }

    /** 내 예매를 정가에 올린다. 확정된 예매이고 경기가 시작 전이어야 한다. 그 경기 대기자 앞쪽 몇 명에게 알린다. */
    @Transactional
    public TransferResponse register(Long sellerId, Long reservationId) {
        LocalDateTime now = LocalDateTime.now(clock);
        // 남의 예매는 존재 여부도 드러내지 않도록 404 (ReservationService.findOwnedReservation과 같은 정책)
        // 예매 행을 잠가 입장 게이트와 엇갈리지 않게 한다. 입장 확인도 이 행을 잠그고 판단하므로,
        // 입장한 예매가 양도글로 올라가거나 양도 중인 예매가 입장하는 일이 없다.
        Reservation reservation = reservationRepository.findForUpdateById(reservationId)
                .filter(found -> found.isOwnedBy(sellerId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        ensureTransferable(reservation, now);

        // 올라오는 순간 줄 서 있던 앞쪽 대기자를 양도글에 저장해 둔다. 이후 대기자가 빠져도 이 순서는 그대로다.
        List<Long> priorityQueue = TransferPriority.queue(now, sellerId,
                waitRepository.findAllByGameIds(List.of(reservation.getGame().getId())));
        TicketTransfer transfer = TicketTransfer.open(reservation, memberRepository.getReferenceById(sellerId), now,
                priorityQueue);
        try {
            // 열린 양도글 중복은 유니크 인덱스가 막는다. 동시에 두 번 눌러도 한 건만 저장된다.
            transferRepository.saveAndFlush(transfer);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.ALREADY_LISTED);
        }
        notifyWaitersAfterCommit(transfer);
        ReservationEmailContent emailContent = buildEmailContent(reservation);
        notifyAfterCommit(sellerId, NotificationType.TRANSFER_REGISTERED, "양도 등록되었습니다",
                emailContent.reservationNumber() + " 예매가 양도 마켓에 등록되었습니다.", emailContent);
        return toResponses(List.of(transfer), sellerId).getFirst();
    }

    @Transactional
    public void cancel(Long sellerId, Long transferId) {
        TicketTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .filter(found -> found.isSoldBy(sellerId))
                .orElseThrow(() -> new BusinessException(ErrorCode.TRANSFER_NOT_FOUND));
        transfer.cancel(LocalDateTime.now(clock));
        ReservationEmailContent emailContent = buildEmailContent(transfer.getReservation());
        notifyAfterCommit(sellerId, NotificationType.TRANSFER_CANCELED, "양도 취소되었습니다",
                emailContent.reservationNumber() + " 예매가 양도 마켓에서 취소되었습니다.", emailContent);
    }

    /**
     * 양도글을 산다. 구매자가 정가를 결제하고, 판매자의 원래 결제는 환불된다.
     * 양도글 행을 먼저 잠가 두 명이 동시에 사도 한 명만 성공하고 나머지는 이미 닫힌 글(409)을 본다.
     * 대기자 우선 구매 시간에는 그 시간의 주인만 살 수 있다.
     */
    @Transactional
    public void buy(Long buyerId, Long transferId, PaymentMethod method) {
        LocalDateTime now = LocalDateTime.now(clock);
        TicketTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRANSFER_NOT_FOUND));
        if (transfer.getStatus() != TicketTransferStatus.OPEN) {
            throw new BusinessException(ErrorCode.TRANSFER_CLOSED);
        }
        if (transfer.isSoldBy(buyerId)) {
            throw new BusinessException(ErrorCode.CANNOT_BUY_OWN_TICKET);
        }

        // 예매 행도 잠근다. 입장 게이트가 같은 예매를 입장 처리하는 중이면 끝날 때까지 기다렸다가 입장한 예매로 보고 거절한다.
        Reservation reservation = reservationRepository.findForUpdateById(transfer.getReservation().getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        Game game = reservation.getGame();
        ensureTransferable(reservation, now);
        ensurePriorityAllows(transfer, game.getId(), buyerId, now);
        // 양도받아도 한 경기에서 살 수 있는 좌석 수 한도는 그대로 적용된다.
        reservationQuota.ensureWithinLimit(game.getId(), buyerId, reservation.getSeats().size());

        String oldTransactionId = reservation.getPaymentTransactionId();
        PaymentResult payment = paymentGateway.pay(new PaymentRequest(buyerId, reservation.getReservationNumber(),
                transfer.getPrice(), method));
        if (!payment.approved()) {
            throw new BusinessException(ErrorCode.PAYMENT_FAILED,
                    payment.failureReason() == null ? ErrorCode.PAYMENT_FAILED.getMessage() : payment.failureReason());
        }
        // 구매자 결제가 승인된 뒤에만 판매자에게 환불한다. (반대 순서면 환불만 나가고 결제가 실패할 수 있다)
        paymentGateway.cancel(oldTransactionId, reservation.getTotalPrice());

        Member buyer = memberRepository.getReferenceById(buyerId);
        reservation.transferTo(buyer, method, payment.transactionId());
        transfer.sell(buyer, now);
        // 표를 구했으니 이 경기 대기에서는 빠진다.
        waitService.leaveQueueAfterPurchase(buyerId, game.getId());

        // 사는 사람과 파는 사람 모두에게 알린다. 메일 내용은 같은 예매 정보를 쓴다.
        ReservationEmailContent emailContent = buildEmailContent(reservation);
        String reservationNumber = emailContent.reservationNumber();
        notifyAfterCommit(buyerId, NotificationType.TRANSFER_BOUGHT, "양도 티켓을 구매했습니다",
                reservationNumber + " 예매를 양도 마켓에서 구매했습니다.", emailContent);
        notifyAfterCommit(transfer.getSeller().getId(), NotificationType.TRANSFER_SOLD, "양도 티켓이 팔렸습니다",
                reservationNumber + " 예매가 양도 마켓에서 팔렸습니다. 결제하신 금액은 환불됩니다.", emailContent);
    }

    /** 경기가 취소되면 그 경기의 판매 중인 양도글도 함께 닫는다. (예매는 따로 환불된다) */
    @Transactional
    public void cancelAllForGame(Long gameId) {
        LocalDateTime now = LocalDateTime.now(clock);
        transferRepository.findAllOpenByGameId(gameId).forEach(transfer -> transfer.cancel(now));
    }

    /** 양도글이 열려 있는 예매는 취소할 수 없다. (ReservationService.cancel이 부른다) */
    public void ensureNotListed(Long reservationId) {
        if (transferRepository.existsByOpenReservationId(reservationId)) {
            throw new BusinessException(ErrorCode.TRANSFER_LISTED);
        }
    }

    private void ensureTransferable(Reservation reservation, LocalDateTime now) {
        if (reservation.getStatus() != ReservationStatus.CONFIRMED || reservation.hasEntered()
                || !reservation.getGame().isBookable(now)) {
            throw new BusinessException(ErrorCode.TRANSFER_NOT_ALLOWED);
        }
    }

    private void ensurePriorityAllows(TicketTransfer transfer, Long gameId, Long buyerId, LocalDateTime now) {
        List<TransferWait> waits = waitRepository.findAllByGameIds(List.of(gameId));
        List<Long> queue = priorityQueueOf(transfer, waits);
        Window window = TransferPriority.current(transfer.getCreatedAt(), queue, now);
        if (window != null && !window.holderId().equals(buyerId)) {
            throw new BusinessException(ErrorCode.TRANSFER_PRIORITY,
                    "대기자 우선 구매 시간입니다. " + window.until().format(TIME_FORMAT) + " 이후에 구매할 수 있어요.");
        }
    }

    /**
     * 이 양도글의 우선 구매 순서. 올라올 때 저장해 둔 값이 있으면 그대로 쓴다.
     * 저장되기 전에 올라온 글만 예전처럼 현재 대기 목록으로 계산한다.
     */
    private List<Long> priorityQueueOf(TicketTransfer transfer, List<TransferWait> waits) {
        return transfer.storedPriorityQueue()
                .orElseGet(() -> TransferPriority.queue(transfer.getCreatedAt(), transfer.getSeller().getId(), waits));
    }

    /** 응답을 만들 때 경기별 대기 줄을 한 번에 가져와 글마다 쿼리가 나가지 않게 한다. */
    private List<TransferResponse> toResponses(Collection<TicketTransfer> transfers, Long viewerId) {
        LocalDateTime now = LocalDateTime.now(clock);
        Set<Long> gameIds = transfers.stream()
                .map(transfer -> transfer.getReservation().getGame().getId())
                .collect(Collectors.toSet());
        Map<Long, List<TransferWait>> waitsByGame = gameIds.isEmpty() ? Map.of()
                : waitRepository.findAllByGameIds(gameIds).stream()
                        .collect(Collectors.groupingBy(wait -> wait.getGame().getId()));

        return transfers.stream().map(transfer -> {
            Window window = null;
            if (transfer.getStatus() == TicketTransferStatus.OPEN) {
                List<TransferWait> waits = waitsByGame.getOrDefault(transfer.getReservation().getGame().getId(),
                        List.of());
                List<Long> queue = priorityQueueOf(transfer, waits);
                window = TransferPriority.current(transfer.getCreatedAt(), queue, now);
            }
            return TransferResponse.from(transfer, viewerId, window == null ? null : window.until(),
                    window != null && window.holderId().equals(viewerId));
        }).toList();
    }

    /** 메일에 쓸 경기·좌석·금액을 커밋 전에 문자열로 뽑아 둔다. (지연 로딩 필드는 커밋 뒤에 읽을 수 없다) */
    private ReservationEmailContent buildEmailContent(Reservation reservation) {
        Game game = reservation.getGame();
        List<String> seatLabels = reservation.getSeats().stream()
                .map(seat -> seat.getSection().getName() + " " + seat.getRowNo() + "열 " + seat.getSeatNo() + "번")
                .toList();
        return new ReservationEmailContent(reservation.getId(), reservation.getReservationNumber(),
                game.getHomeTeam().getName(), game.getAwayTeam().getName(), game.getStadium().getName(),
                game.getStartAt(), seatLabels, reservation.getTotalPrice());
    }

    /** 양도 거래 당사자(판매자·구매자)에게 알린다. 커밋 뒤에 보내고, 실패해도 거래는 그대로 성공한다. */
    private void notifyAfterCommit(Long memberId, NotificationType type, String title, String message,
            ReservationEmailContent emailContent) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    notificationService.create(memberId, type, title, message, emailContent);
                } catch (RuntimeException e) {
                    log.warn("양도 알림을 보내지 못했습니다. memberId={}, type={}", memberId, type, e);
                }
            }
        });
    }

    /**
     * 양도글이 올라온 걸 앞쪽 대기자에게 알린다. 각자의 우선 구매 시간대를 함께 알려 준다.
     * 알림은 부가 작업이라 커밋 뒤에 보내고, 실패해도 등록은 그대로 성공한다. (ReservationService.notifyAfterCommit과 같은 이유)
     */
    private void notifyWaitersAfterCommit(TicketTransfer transfer) {
        Game game = transfer.getReservation().getGame();
        // 구매 검증과 같은 값을 안내하도록, 방금 저장한 우선 순서를 그대로 쓴다.
        List<Long> queue = priorityQueueOf(transfer, waitRepository.findAllByGameIds(List.of(game.getId())));
        if (queue.isEmpty()) {
            return;
        }
        // 지연 로딩 필드는 커밋 뒤에 읽을 수 없어서, 지금 문자열로 만들어 둔다.
        String matchup = game.getAwayTeam().getName() + " vs " + game.getHomeTeam().getName();
        LocalDateTime listedAt = transfer.getCreatedAt();
        Map<Long, String> messages = new LinkedHashMap<>();
        for (int i = 0; i < queue.size(); i++) {
            messages.put(queue.get(i), matchup + " 양도글이 올라왔어요. 내 우선 구매 시간은 "
                    + TransferPriority.startOf(listedAt, i).format(TIME_FORMAT) + "~"
                    + TransferPriority.endOf(listedAt, i).format(TIME_FORMAT) + "예요.");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messages.forEach((memberId, message) -> {
                    try {
                        notificationService.create(memberId, NotificationType.TRANSFER_AVAILABLE,
                                "기다리던 양도글이 올라왔어요", message, null);
                    } catch (RuntimeException e) {
                        log.warn("양도 대기 알림을 보내지 못했습니다. memberId={}", memberId, e);
                    }
                });
            }
        });
    }
}
