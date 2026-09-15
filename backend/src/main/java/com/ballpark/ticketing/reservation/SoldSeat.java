package com.ballpark.ticketing.reservation;

import com.ballpark.ticketing.seat.SeatPosition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * 현재 판매 완료된 좌석. (경기, 구역, 열, 번호) 유니크 제약이 중복 판매를 막는 최종 방어선이다.
 */
@Entity
@Table(name = "sold_seats", uniqueConstraints = @UniqueConstraint(
        name = "uk_sold_seats_seat", columnNames = {"game_id", "section_id", "row_no", "seat_no"}))
public class SoldSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long gameId;

    @Column(nullable = false)
    private Long sectionId;

    @Column(nullable = false)
    private int rowNo;

    @Column(nullable = false)
    private int seatNo;

    @Column(nullable = false)
    private Long reservationId;

    protected SoldSeat() {
    }

    public SoldSeat(Long gameId, SeatPosition seat, Long reservationId) {
        this.gameId = gameId;
        this.sectionId = seat.sectionId();
        this.rowNo = seat.rowNo();
        this.seatNo = seat.seatNo();
        this.reservationId = reservationId;
    }

    public SeatPosition toPosition() {
        return new SeatPosition(sectionId, rowNo, seatNo);
    }

    public Long getId() {
        return id;
    }

    public Long getGameId() {
        return gameId;
    }

    public Long getReservationId() {
        return reservationId;
    }
}
