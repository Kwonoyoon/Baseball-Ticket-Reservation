package com.ballpark.ticketing.admin.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 관리자 대시보드에 한 번에 보여 줄 숫자들. 날짜는 모두 서울 시간 기준이다. */
public record AdminDashboardResponse(
        LocalDate date,
        Today today,
        Pending pending,
        List<Daily> last7Days,
        List<GameDemand> topGames) {

    /** 오늘 하루의 집계. revenue는 오늘 예매해서 아직 확정 상태인 건의 합계다. */
    public record Today(long reservations, long canceled, long revenue, long newMembers, long entered) {
    }

    /** 관리자가 챙겨야 할 것들. */
    public record Pending(long reports, long lockedMembers, long totalMembers) {
    }

    /** 하루치 추이. */
    public record Daily(LocalDate date, long reservations, long canceled, long revenue) {
    }

    /** 곧 열리는 경기의 예매 현황. rate는 0~100(%)이고 소수 둘째 자리까지 준다. (좌석이 많아 1% 미만인 경기가 흔하다) */
    public record GameDemand(Long gameId, String homeTeam, String awayTeam, LocalDateTime startAt, long sold,
            long capacity, double rate) {
    }
}
