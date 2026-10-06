package com.ballpark.ticketing.transfer;

import java.time.LocalDateTime;

import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.reservation.Reservation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 정가 양도글. 예매 한 건을 통째로 올리며, 값은 원래 결제 금액 그대로다. (웃돈을 붙일 수 없게 가격을 받지 않는다)
 */
@Entity
@Table(name = "ticket_transfers")
public class TicketTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id")
    private Member seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id")
    private Member buyer;

    @Column(nullable = false)
    private int price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketTransferStatus status;

    /** OPEN일 때만 예매 id, 닫히면 null. 열린 양도글이 예매마다 하나뿐임을 DB 유니크 인덱스로 보장한다. */
    @Column(name = "open_reservation_id", unique = true)
    private Long openReservationId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime closedAt;

    protected TicketTransfer() {
    }

    public static TicketTransfer open(Reservation reservation, Member seller, LocalDateTime now) {
        TicketTransfer transfer = new TicketTransfer();
        transfer.reservation = reservation;
        transfer.seller = seller;
        transfer.price = reservation.getTotalPrice();
        transfer.status = TicketTransferStatus.OPEN;
        transfer.openReservationId = reservation.getId();
        transfer.createdAt = now;
        return transfer;
    }

    public void sell(Member buyer, LocalDateTime now) {
        close(TicketTransferStatus.SOLD, now);
        this.buyer = buyer;
    }

    public void cancel(LocalDateTime now) {
        close(TicketTransferStatus.CANCELED, now);
    }

    private void close(TicketTransferStatus next, LocalDateTime now) {
        if (status != TicketTransferStatus.OPEN) {
            throw new BusinessException(ErrorCode.TRANSFER_CLOSED);
        }
        this.status = next;
        this.openReservationId = null;
        this.closedAt = now;
    }

    public boolean isSoldBy(Long memberId) {
        return seller.getId().equals(memberId);
    }

    public Long getId() {
        return id;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public Member getSeller() {
        return seller;
    }

    public Member getBuyer() {
        return buyer;
    }

    public int getPrice() {
        return price;
    }

    public TicketTransferStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
