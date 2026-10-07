package com.ballpark.ticketing.reservation;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

    /** 입장 게이트에서 입장 확인된 시각. 입장 전이면 null */
    private LocalDateTime enteredAt;

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
        if (status != ReservationStatus.PENDING) {
            throw new BusinessException(ErrorCode.PAYMENT_EXPIRED);
        }
        this.paymentTransactionId = transactionId;
        this.status = ReservationStatus.CONFIRMED;
    }

    public boolean isPending() {
        return status == ReservationStatus.PENDING;
    }

    /** 결제를 마쳐야 하는 시각 */
    public LocalDateTime paymentDeadline(Duration paymentTimeLimit) {
        return createdAt.plus(paymentTimeLimit);
    }

    /** 결제 대기 중인데 결제 시간이 지났는지 */
    public boolean isPaymentOverdue(LocalDateTime now, Duration paymentTimeLimit) {
        return isPending() && !now.isBefore(paymentDeadline(paymentTimeLimit));
    }

    /**
     * 양도로 소유자가 바뀔 때 쓴다. 예매번호·좌석은 그대로 두고 소유자와 결제 정보만 구매자 것으로 바꾼다.
     * (이후 취소하면 구매자가 낸 결제가 환불되어야 하므로 결제 번호도 같이 옮긴다)
     */
    public void transferTo(Member buyer, PaymentMethod method, String transactionId) {
        if (status != ReservationStatus.CONFIRMED || hasEntered()) {
            throw new BusinessException(ErrorCode.TRANSFER_NOT_ALLOWED);
        }
        this.member = buyer;
        this.paymentMethod = method;
        this.paymentTransactionId = transactionId;
    }

    /** 입장한 예매는 경기 시작 전이어도 취소할 수 없다. */
    public boolean isCancelable(LocalDateTime now) {
        return status == ReservationStatus.CONFIRMED && !hasEntered() && game.isBookable(now);
    }

    /** 입장 게이트에서 입장시킨다. 입장 가능 여부(시간·상태)는 EntryTicketService가 판단한다. */
    public void enter(LocalDateTime now) {
        if (hasEntered()) {
            throw new IllegalStateException("이미 입장한 예매입니다: " + id);
        }
        // 초 단위면 충분하다. (자르지 않으면 DB가 반올림해 저장해서, 이번 응답과 다음에 읽은 값이 달라진다)
        this.enteredAt = now.truncatedTo(ChronoUnit.SECONDS);
    }

    public boolean hasEntered() {
        return enteredAt != null;
    }

    public void cancel(LocalDateTime now) {
        if (!isCancelable(now)) {
            throw new BusinessException(ErrorCode.NOT_CANCELABLE);
        }
        this.status = ReservationStatus.CANCELED;
        this.canceledAt = now;
    }

    /** 경기 자체가 취소되어 예매가 자동으로 취소될 때 쓴다. 회원이 직접 취소할 때와 달리 경기 시작 여부는 따지지 않는다. */
    public void cancelDueToGameCancellation(LocalDateTime now) {
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

    public LocalDateTime getEnteredAt() {
        return enteredAt;
    }

    public List<ReservationSeat> getSeats() {
        return seats;
    }
}
