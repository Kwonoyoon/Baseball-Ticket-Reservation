package com.ballpark.ticketing.transfer;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameRepository;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.notification.NotificationService;
import com.ballpark.ticketing.notification.NotificationType;
import com.ballpark.ticketing.notification.WaitEmailContent;
import com.ballpark.ticketing.transfer.dto.TransferWaitResponse;

/** 양도 대기 등록. 대기자가 되면 그 경기의 양도글이 올라올 때 먼저 살 수 있는 순서를 받는다. */
@Service
@Transactional(readOnly = true)
public class TransferWaitService {

    private static final Logger log = LoggerFactory.getLogger(TransferWaitService.class);

    private final TransferWaitRepository waitRepository;
    private final GameRepository gameRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public TransferWaitService(TransferWaitRepository waitRepository, GameRepository gameRepository,
            NotificationService notificationService, Clock clock) {
        this.waitRepository = waitRepository;
        this.gameRepository = gameRepository;
        this.notificationService = notificationService;
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
        int position = positionOf(wait);
        sendAfterCommit(List.of(new Notice(memberId, NotificationType.TRANSFER_WAIT_REGISTERED,
                "양도 대기 등록되었습니다", matchup(game) + " 대기가 등록되었어요. 내 순서는 " + position + "번째예요.",
                emailContent(game, position), true)));
        return TransferWaitResponse.from(wait, position);
    }

    @Transactional
    public void cancel(Long memberId, Long waitId) {
        TransferWait wait = waitRepository.findByIdAndMemberId(waitId, memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WAIT_NOT_FOUND));
        Game game = wait.getGame();
        List<Notice> notices = new ArrayList<>();
        notices.add(new Notice(memberId, NotificationType.TRANSFER_WAIT_CANCELED, "양도 대기 취소되었습니다",
                matchup(game) + " 양도 대기를 취소했어요.", emailContent(game, 0), true));
        notices.addAll(removeFromQueue(wait));
        sendAfterCommit(notices);
    }

    /** 양도글을 사서 그 경기 대기에서 빠질 때 부른다. 뒤에 있던 대기자의 순번이 당겨진 걸 알린다. */
    @Transactional
    public void leaveQueueAfterPurchase(Long memberId, Long gameId) {
        waitRepository.findByMemberIdAndGameId(memberId, gameId)
                .ifPresent(wait -> sendAfterCommit(removeFromQueue(wait)));
    }

    /**
     * 대기에서 지우고, 뒤에 있던 대기자들의 새 순번 알림을 만든다. 앱 알림은 모두에게 가고,
     * 이메일은 우선 구매 순서({@link TransferPriority#SLOT_COUNT}번째) 안으로 들어온 사람에게만 간다.
     */
    private List<Notice> removeFromQueue(TransferWait wait) {
        Game game = wait.getGame();
        List<TransferWait> queue = waitRepository.findAllByGameIds(List.of(game.getId()));
        int removedIndex = indexOf(queue, wait);
        waitRepository.delete(wait);

        List<Notice> notices = new ArrayList<>();
        // 앞 사람이 하나 빠졌으니 뒤에 있던 사람은 각자 한 칸씩 당겨진다. (줄에서 인덱스 i였던 사람의 새 순번이 i)
        for (int i = removedIndex + 1; i < queue.size(); i++) {
            notices.add(positionNotice(queue.get(i).getMemberId(), game, i));
        }
        return notices;
    }

    private Notice positionNotice(Long memberId, Game game, int newPosition) {
        String title = newPosition == 1 ? "대기 1번째가 되었어요" : "대기 순번이 바뀌었어요";
        String message = matchup(game) + " 앞선 대기자가 빠져서 내 순서가 " + newPosition
                + (newPosition == 1 ? "번째가 되었어요." : "번째로 바뀌었어요.");
        return new Notice(memberId, NotificationType.TRANSFER_WAIT_POSITION, title, message,
                emailContent(game, newPosition), newPosition <= TransferPriority.SLOT_COUNT);
    }

    private static String matchup(Game game) {
        return game.getAwayTeam().getName() + " vs " + game.getHomeTeam().getName();
    }

    /** 지연 로딩 필드는 커밋 뒤에 읽을 수 없어서, 메일에 쓸 값을 지금 뽑아 둔다. */
    private static WaitEmailContent emailContent(Game game, int position) {
        return new WaitEmailContent(game.getHomeTeam().getName(), game.getAwayTeam().getName(),
                game.getStadium().getName(), game.getStartAt(), position);
    }

    /** 알림은 부가 작업이라 커밋 뒤에 보내고, 실패해도 대기 처리는 그대로 성공한다. */
    private void sendAfterCommit(List<Notice> notices) {
        if (notices.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (Notice notice : notices) {
                    try {
                        notificationService.createWaitNotification(notice.memberId(), notice.type(), notice.title(),
                                notice.message(), notice.emailContent(), notice.sendEmail());
                    } catch (RuntimeException e) {
                        log.warn("양도 대기 알림을 보내지 못했습니다. memberId={}, type={}", notice.memberId(),
                                notice.type(), e);
                    }
                }
            }
        });
    }

    private record Notice(Long memberId, NotificationType type, String title, String message,
            WaitEmailContent emailContent, boolean sendEmail) {
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
