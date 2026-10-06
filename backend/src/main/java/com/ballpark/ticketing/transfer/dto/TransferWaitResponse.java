package com.ballpark.ticketing.transfer.dto;

import java.time.LocalDateTime;

import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.transfer.TransferWait;

/** position은 같은 경기 대기자 중 내 순서(1부터). 1번이 양도글이 올라오면 가장 먼저 살 수 있다. */
public record TransferWaitResponse(Long id, LocalDateTime createdAt, int position, GameSummaryResponse game) {

    public static TransferWaitResponse from(TransferWait wait, int position) {
        return new TransferWaitResponse(wait.getId(), wait.getCreatedAt(), position,
                GameSummaryResponse.from(wait.getGame()));
    }
}
