package com.ballpark.ticketing.stadium;

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
 * 구장의 좌석 구역. 좌석은 행으로 저장하지 않고 (열 번호, 좌석 번호) 격자로 표현한다.
 */
@Entity
@Table(name = "seat_sections")
public class SeatSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stadium_id")
    private Stadium stadium;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatGrade grade;

    @Column(nullable = false)
    private int price;

    @Column(nullable = false)
    private int seatRows;

    @Column(nullable = false)
    private int seatsPerRow;

    @Column(nullable = false)
    private int displayOrder;

    protected SeatSection() {
    }

    public boolean contains(int rowNo, int seatNo) {
        return rowNo >= 1 && rowNo <= seatRows && seatNo >= 1 && seatNo <= seatsPerRow;
    }

    public Long getId() {
        return id;
    }

    public Stadium getStadium() {
        return stadium;
    }

    public String getName() {
        return name;
    }

    public SeatGrade getGrade() {
        return grade;
    }

    public int getPrice() {
        return price;
    }

    public int getSeatRows() {
        return seatRows;
    }

    public int getSeatsPerRow() {
        return seatsPerRow;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }
}
