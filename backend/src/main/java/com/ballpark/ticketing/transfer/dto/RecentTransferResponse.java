package com.ballpark.ticketing.transfer.dto;

import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.transfer.TicketTransfer;

/**
 * 메인 화면 "방금 올라온 티켓 양도"의 한 줄. 비회원에게도 보여 주므로 판매자·예매 정보는 싣지 않고
 * 경기, 정가, 좌석 수와 첫 좌석의 구역 이름만 준다.
 */
public record RecentTransferResponse(Long id, int price, GameSummaryResponse game, int seatCount, String sectionName) {

    public static RecentTransferResponse from(TicketTransfer transfer) {
        var seats = transfer.getReservation().getSeats();
        return new RecentTransferResponse(transfer.getId(), transfer.getPrice(),
                GameSummaryResponse.from(transfer.getReservation().getGame()), seats.size(),
                seats.isEmpty() ? null : seats.getFirst().getSection().getName());
    }
}
