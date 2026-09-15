package com.ballpark.ticketing.reservation;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.member.Member;
import com.ballpark.ticketing.reservation.payment.PaymentMethod;
import com.ballpark.ticketing.stadium.SeatSection;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String reservationNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    @Column(nullable = false)
    private int totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Column(length = 64)
    private String paymentTransactionId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime canceledAt;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<ReservationSeat> seats = new ArrayList<>();

    protected Reservation() {
    }

    public Reservation(String reservationNumber, Member member, Game game, PaymentMethod paymentMethod,
            LocalDateTime createdAt) {
        this.reservationNumber = reservationNumber;
        this.member = member;
        this.game = game;
        this.paymentMethod = paymentMethod;
        this.createdAt = createdAt;
        this.status = ReservationStatus.PENDING;
    }

    public void addSeat(SeatSection section, int rowNo, int seatNo) {
        ReservationSeat seat = new ReservationSeat(this, section, rowNo, seatNo, section.getPrice());
        seats.add(seat);
        totalPrice += seat.getPrice();
    }

    public void confirm(String transactionId) {
        this.paymentTransactionId = transactionId;
        this.status = ReservationStatus.CONFIRMED;
    }

    public boolean isCancelable(LocalDateTime now) {
        return status == ReservationStatus.CONFIRMED && game.isBookable(now);
    }

    public void cancel(LocalDateTime now) {
        if (!isCancelable(now)) {
            throw new BusinessException(ErrorCode.NOT_CANCELABLE);
        }
        this.status = ReservationStatus.CANCELED;
        this.canceledAt = now;
    }

    public boolean isOwnedBy(Long memberId) {
        return member.getId().equals(memberId);
    }

    public Long getId() {
        return id;
    }

    public String getReservationNumber() {
        return reservationNumber;
    }

    public Member getMember() {
        return member;
    }

    public Game getGame() {
        return game;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public int getTotalPrice() {
        return totalPrice;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public String getPaymentTransactionId() {
        return paymentTransactionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCanceledAt() {
        return canceledAt;
    }

    public List<ReservationSeat> getSeats() {
        return seats;
    }
}
