package com.ballpark.ticketing.transfer;

public enum TicketTransferStatus {
    /** 판매 중 */
    OPEN,
    SOLD,
    /** 판매자가 거둬들이거나, 경기가 취소되어 닫힘 */
    CANCELED
}
