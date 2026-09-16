package com.ballpark.ticketing.seat.dto;

import java.util.List;

/**
 * 한 구역의 실시간 좌석 현황. 좌석은 {@code "구역ID-열-번호"} 키로 표현한다.
 *
 * @param sectionId   조회한 구역
 * @param soldSeats   판매된 좌석
 * @param heldSeats   다른 회원이 선점 중인 좌석
 * @param myHeldSeats 요청한 회원이 선점 중인 좌석 (비로그인이면 비어 있음)
 */
public record SeatStatusResponse(
        Long sectionId,
        List<String> soldSeats,
        List<String> heldSeats,
        List<String> myHeldSeats) {
}
