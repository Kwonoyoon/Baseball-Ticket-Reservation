package com.ballpark.ticketing.member.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, MemberResponse member) {
}
