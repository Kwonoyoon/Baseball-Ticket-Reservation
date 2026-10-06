package com.ballpark.ticketing.transfer;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.transfer.dto.TransferWaitResponse;

/** 양도 대기 등록. 대기자가 되면 그 경기의 양도글이 올라올 때 먼저 살 수 있는 순서를 받는다. */
@Service
@Transactional(readOnly = true)
public class TransferWaitService {

    private final TransferWaitRepository waitRepository;
    private final GameRepository gameRepository;
    private final Clock clock;

    public TransferWaitService(TransferWaitRepository waitRepository, GameRepository gameRepository, Clock clock) {
        this.waitRepository = waitRepository;
        this.gameRepository = gameRepository;
        this.clock = clock;
    }

    @Transactional
    public TransferWaitResponse register(Long memberId, Long gameId) {
        LocalDateTime now = LocalDateTime.now(clock);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GAME_NOT_FOUND));
        if (!game.isBookable(now)) {
            throw new BusinessException(ErrorCode.BOOKING_CLOSED);
        }
        TransferWait wait = new TransferWait(memberId, game, now);
        try {
            // 같은 경기에 두 번 등록하는 요청은 유니크 제약이 막는다.
            waitRepository.saveAndFlush(wait);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.ALREADY_WAITING);
        }
        return TransferWaitResponse.from(wait, positionOf(wait));
    }

    @Transactional
    public void cancel(Long memberId, Long waitId) {
        TransferWait wait = waitRepository.findByIdAndMemberId(waitId, memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WAIT_NOT_FOUND));
        waitRepository.delete(wait);
    }

    public List<TransferWaitResponse> listMine(Long memberId) {
        List<TransferWait> mine = waitRepository.findActiveByMemberId(memberId, LocalDateTime.now(clock));
        // 경기마다 줄 선 순서대로 모아 두고, 그 안에서 내 위치를 센다.
        Map<Long, List<TransferWait>> queues = waitRepository
                .findAllByGameIds(mine.stream().map(wait -> wait.getGame().getId()).toList()).stream()
                .collect(Collectors.groupingBy(wait -> wait.getGame().getId()));
        return mine.stream()
                .map(wait -> TransferWaitResponse.from(wait, indexOf(queues.get(wait.getGame().getId()), wait) + 1))
                .toList();
    }

    private int positionOf(TransferWait wait) {
        List<TransferWait> queue = waitRepository.findAllByGameIds(List.of(wait.getGame().getId()));
        return indexOf(queue, wait) + 1;
    }

    private static int indexOf(List<TransferWait> queue, TransferWait wait) {
        for (int i = 0; i < queue.size(); i++) {
            if (queue.get(i).getId().equals(wait.getId())) {
                return i;
            }
        }
        return queue.size();
    }
}
