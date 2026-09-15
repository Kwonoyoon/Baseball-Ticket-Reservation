package com.ballpark.ticketing.reservation;

import com.ballpark.ticketing.seat.SeatPosition;
import com.ballpark.ticketing.stadium.SeatSection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "reservation_seats")
public class ReservationSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id")
    private SeatSection section;

    @Column(nullable = false)
    private int rowNo;

    @Column(nullable = false)
    private int seatNo;

    /** 예매 시점의 가격 */
    @Column(nullable = false)
    private int price;

    protected ReservationSeat() {
    }

    ReservationSeat(Reservation reservation, SeatSection section, int rowNo, int seatNo, int price) {
        this.reservation = reservation;
        this.section = section;
        this.rowNo = rowNo;
        this.seatNo = seatNo;
        this.price = price;
    }

    public SeatPosition toPosition() {
        return new SeatPosition(section.getId(), rowNo, seatNo);
    }

    public Long getId() {
        return id;
    }

    public SeatSection getSection() {
        return section;
    }

    public int getRowNo() {
        return rowNo;
    }

    public int getSeatNo() {
        return seatNo;
    }

    public int getPrice() {
        return price;
    }
}
