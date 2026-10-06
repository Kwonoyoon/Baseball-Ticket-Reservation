package com.ballpark.ticketing.stadium;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "stadiums")
public class Stadium {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String city;

    /** 좌석 배치도를 고르는 코드 (예: JAMSIL). 프론트 lib/stadiumMaps.ts 의 키와 같다. */
    @Column(length = 20)
    private String code;

    protected Stadium() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCity() {
        return city;
    }

    public String getCode() {
        return code;
    }
}
