package com.ballpark.ticketing.stadium.dto;

import java.io.Serializable;

import com.ballpark.ticketing.stadium.Stadium;

/** code: 좌석 배치도를 고르는 구장 코드 (예: JAMSIL). 배치도가 없는 구장은 null */
public record StadiumResponse(Long id, String name, String city, String code) implements Serializable {

    public static StadiumResponse from(Stadium stadium) {
        return new StadiumResponse(stadium.getId(), stadium.getName(), stadium.getCity(), stadium.getCode());
    }
}
