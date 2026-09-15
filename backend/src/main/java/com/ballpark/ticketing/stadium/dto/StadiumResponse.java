package com.ballpark.ticketing.stadium.dto;

import java.io.Serializable;

import com.ballpark.ticketing.stadium.Stadium;

public record StadiumResponse(Long id, String name, String city) implements Serializable {

    public static StadiumResponse from(Stadium stadium) {
        return new StadiumResponse(stadium.getId(), stadium.getName(), stadium.getCity());
    }
}
