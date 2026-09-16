package com.ballpark.ticketing.seat.dto;

import java.util.List;

/**
 * 구장 화면에 쓰는 구역별 요약. 좌석 목록 대신 개수만 담아 좌석 수가 많아도 응답이 작다.
 *
 * @param sections           구역별 잔여 현황
 * @param myHeldSeats        요청한 회원이 이 경기에서 선점 중인 좌석 (비로그인이면 비어 있음)
 * @param myReservedSeats    요청한 회원이 이 경기에서 이미 예매한 좌석 수
 * @param maxSeatsPerMember  한 회원이 이 경기에서 예매할 수 있는 최대 좌석 수
 */
public record SeatSummaryResponse(
        List<SectionAvailability> sections,
        List<String> myHeldSeats,
        int myReservedSeats,
        int maxSeatsPerMember) {

    /**
     * @param totalSeats     구역 전체 좌석 수
     * @param soldSeats      판매된 좌석 수
     * @param heldSeats      선점 중인 좌석 수 (본인 선점 포함)
     * @param availableSeats 지금 선택할 수 있는 좌석 수
     */
    public record SectionAvailability(
            Long sectionId,
            int totalSeats,
            int soldSeats,
            int heldSeats,
            int availableSeats) {

        public static SectionAvailability of(Long sectionId, int totalSeats, int soldSeats, int heldSeats) {
            return new SectionAvailability(sectionId, totalSeats, soldSeats, heldSeats,
                    Math.max(0, totalSeats - soldSeats - heldSeats));
        }
    }
}
