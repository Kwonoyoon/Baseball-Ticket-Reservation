package com.ballpark.ticketing.member.dto;

/** teamId가 null이면 관심 구단 설정을 해제한다. */
public record FavoriteTeamRequest(Long teamId) {
}
