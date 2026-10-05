package com.ballpark.ticketing.transfer.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.transfer.TicketTransfer;
import com.ballpark.ticketing.transfer.TicketTransferStatus;

/**
 * 양도글 한 건. 예매 id·예매번호는 싣지 않는다. (구매 전에는 남의 예매를 특정할 수 있는 값을 보여 줄 이유가 없다)
 */
public record TransferResponse(
        Long id,
        TicketTransferStatus status,
        int price,
        LocalDateTime createdAt,
        boolean mine,
        String sellerName,
        GameSummaryResponse game,
        List<String> seats) {

    public static TransferResponse from(TicketTransfer transfer, Long viewerId) {
        return new TransferResponse(
                transfer.getId(),
                transfer.getStatus(),
                transfer.getPrice(),
                transfer.getCreatedAt(),
                transfer.isSoldBy(viewerId),
                maskName(transfer.getSeller().getName()),
                GameSummaryResponse.from(transfer.getReservation().getGame()),
                transfer.getReservation().getSeats().stream()
                        .map(seat -> seat.getSection().getName() + " " + seat.getRowNo() + "열 " + seat.getSeatNo() + "번")
                        .toList());
    }

    /** 홍길동 → 홍**. 판매자 실명을 그대로 노출하지 않는다. */
    static String maskName(String name) {
        if (name == null || name.length() <= 1) {
            return name;
        }
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }
}
