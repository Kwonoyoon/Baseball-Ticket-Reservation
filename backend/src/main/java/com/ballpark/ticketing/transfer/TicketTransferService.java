package com.ballpark.ticketing.transfer;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.member.MemberRepository;
import com.ballpark.ticketing.reservation.Reservation;
import com.ballpark.ticketing.reservation.ReservationQuota;
import com.ballpark.ticketing.reservation.ReservationRepository;
import com.ballpark.ticketing.reservation.ReservationStatus;
import com.ballpark.ticketing.reservation.payment.PaymentGateway;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentRequest;
import com.ballpark.ticketing.reservation.payment.PaymentGateway.PaymentResult;
import com.ballpark.ticketing.reservation.payment.PaymentMethod;
import com.ballpark.ticketing.transfer.dto.TransferResponse;

/**
 * 정가 양도 마켓. 예매 한 건을 통째로 올리고 사 간다.
 * 좌석(sold_seats)과 예매번호는 그대로 두고, 예매의 소유자와 결제 정보만 구매자로 옮긴다.
 * 그래서 중복 판매 방어선과 예매 상태값은 건드리지 않으며, 캘린더·통계도 CONFIRMED 기준 그대로 동작한다.
 */
@Service
@Transactional(readOnly = true)
public class TicketTransferService {

    private final TicketTransferRepository transferRepository;
    private final ReservationRepository reservationRepository;
    private final MemberRepository memberRepository;
    private final ReservationQuota reservationQuota;
    private final PaymentGateway paymentGateway;
    private final Clock clock;

    public TicketTransferService(TicketTransferRepository transferRepository,
            ReservationRepository reservationRepository, MemberRepository memberRepository,
            ReservationQuota reservationQuota, PaymentGateway paymentGateway, Clock clock) {
        this.transferRepository = transferRepository;
        this.reservationRepository = reservationRepository;
        this.memberRepository = memberRepository;
        this.reservationQuota = reservationQuota;
        this.paymentGateway = paymentGateway;
        this.clock = clock;
    }

    public List<TransferResponse> listOpen(Long viewerId, Long teamId) {
        return transferRepository.findOpen(LocalDateTime.now(clock), teamId).stream()
                .map(transfer -> TransferResponse.from(transfer, viewerId))
                .toList();
    }

    public List<TransferResponse> listMine(Long sellerId) {
        return transferRepository.findAllBySellerId(sellerId).stream()
                .map(transfer -> TransferResponse.from(transfer, sellerId))
                .toList();
    }

    /** 내 예매를 정가에 올린다. 확정된 예매이고 경기가 시작 전이어야 한다. */
    @Transactional
    public TransferResponse register(Long sellerId, Long reservationId) {
        LocalDateTime now = LocalDateTime.now(clock);
        // 남의 예매는 존재 여부도 드러내지 않도록 404 (ReservationService.findOwnedReservation과 같은 정책)
        Reservation reservation = reservationRepository.findDetailById(reservationId)
                .filter(found -> found.isOwnedBy(sellerId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        ensureTransferable(reservation, now);

        TicketTransfer transfer = TicketTransfer.open(reservation, memberRepository.getReferenceById(sellerId), now);
        try {
            // 열린 양도글 중복은 유니크 인덱스가 막는다. 동시에 두 번 눌러도 한 건만 저장된다.
            transferRepository.saveAndFlush(transfer);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.ALREADY_LISTED);
        }
        return TransferResponse.from(transfer, sellerId);
    }

    @Transactional
    public void cancel(Long sellerId, Long transferId) {
        TicketTransfer transfer = transferRepository.findByIdForUpdate(transferId)
                .filter(found -> found.isSoldBy(sellerId))
                .orElseThrow(() -> new BusinessException(ErrorCode.TRANSFER_NOT_FOUND));
        transfer.cancel(LocalDateTime.now(clock));
    }

    /**
     * 양도글을 산다. 구매자가 정가를 결제하고, 판매자의 원래 결제는 환불된다.
     * 양도글 행을 먼저 잠가 두 명이 동시에 사도 한 명만 성공하고 나머지는 이미 닫힌 글(409)을 본다.
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
        ensureTransferable(reservation, now);
        // 양도받아도 한 경기에서 살 수 있는 좌석 수 한도는 그대로 적용된다.
        reservationQuota.ensureWithinLimit(reservation.getGame().getId(), buyerId, reservation.getSeats().size());

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
}
