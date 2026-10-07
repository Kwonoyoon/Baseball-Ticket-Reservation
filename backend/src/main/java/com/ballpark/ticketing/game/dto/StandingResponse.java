package com.ballpark.ticketing.game.dto;

import com.ballpark.ticketing.team.dto.TeamResponse;

/**
 * 순위표 한 줄. 승률은 무승부를 뺀 승 ÷ (승 + 패)다. 승패가 아직 없으면 0이다.
 * gamesBehind는 선두와의 승차((선두 승 − 내 승) + (내 패 − 선두 패)) ÷ 2이다.
 */
public record StandingResponse(
        int rank,
        TeamResponse team,
        int wins,
        int losses,
        int draws,
        double winPct,
        double gamesBehind) {
}
