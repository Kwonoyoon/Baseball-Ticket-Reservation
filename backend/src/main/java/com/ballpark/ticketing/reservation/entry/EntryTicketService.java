package com.ballpark.ticketing.reservation.entry;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameStatus;
import com.ballpark.ticketing.global.error.BusinessException;
import com.ballpark.ticketing.global.error.ErrorCode;
import com.ballpark.ticketing.reservation.Reservation;
import com.ballpark.ticketing.reservation.ReservationRepository;
import com.ballpark.ticketing.reservation.ReservationStatus;
import com.ballpark.ticketing.reservation.dto.ReservationResponse;
import com.ballpark.ticketing.reservation.entry.EntryTokenCodec.EntryClaims;
import com.ballpark.ticketing.reservation.entry.EntryTokenCodec.IssuedToken;
import com.ballpark.ticketing.reservation.entry.EntryTokenCodec.ParseResult;

/**
 * 입장 QR을 발급하고(내 티켓 화면) 검증해 입장시킨다(입장 게이트).
 * QR 값은 서버가 서명하고 30초만 유효해서, 화면을 캡처하거나 값을 고쳐 만든 QR로는 들어올 수 없다.
 * 한 예매는 한 번만 입장한다. (일행이 여러 장을 한 예매로 샀으면 함께 들어온다)
 */
@Service
@Transactional(readOnly = true)
public class EntryTicketService {

    private final ReservationRepository reservationRepository;
    private final EntryPolicy entryPolicy;
    private final EntryTokenCodec tokenCodec;
    private final Clock clock;

    public EntryTicketService(ReservationRepository reservationRepository, EntryPolicy entryPolicy,
            EntryTokenCodec tokenCodec, Clock clock) {
        this.reservationRepository = reservationRepository;
        this.entryPolicy = entryPolicy;
        this.tokenCodec = tokenCodec;
        this.clock = clock;
    }

    /** 확정된 내 예매의 입장 정보와 QR 값을 준다. 끝났거나 취소된 경기는 QR 값 없이 시각만 준다. */
    public EntryTicketResponse issue(Long memberId, Long reservationId) {
        Reservation reservation = reservationRepository.findDetailById(reservationId)
                .filter(found -> found.isOwnedBy(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESERVATION_NOT_FOUND));
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.ENTRY_TICKET_UNAVAILABLE);
        }
        Game game = reservation.getGame();
        LocalDateTime now = LocalDateTime.now(clock);
        boolean usable = game.getStatus() != GameStatus.CANCELED && !entryPolicy.isOver(game, now);
        IssuedToken issued = usable ? tokenCodec.issue(reservation.getId(), reservation.getReservationNumber()) : null;
        return new EntryTicketResponse(entryPolicy.entryOpensAt(game), game.getStartAt(),
                entryPolicy.gameEndsAt(game),
                issued == null ? null : issued.token(),
                issued == null ? null : issued.expiresInSeconds());
    }

    /**
     * 입장 게이트에서 읽은 QR 값을 검증하고, 입장할 수 있으면 바로 입장 처리한다. 이미 입장한 예매는 거부한다.
     * 예매 행을 잠그고 판단하므로 같은 예매의 QR을 두 게이트에서 동시에 읽어도 한 곳만 입장 확인된다.
     */
    @Transactional
    public EntryVerifyResponse verify(String token) {
        ParseResult parsed = tokenCodec.parse(token);
        if (parsed.expired()) {
            return EntryVerifyResponse.rejected(EntryVerifyResult.EXPIRED_TOKEN);
        }
        EntryClaims claims = parsed.claims();
        if (claims == null) {
            return EntryVerifyResponse.rejected(EntryVerifyResult.INVALID_TOKEN);
        }
        Reservation reservation = reservationRepository.findForUpdateById(claims.reservationId())
                .filter(found -> found.getReservationNumber().equals(claims.reservationNumber()))
                .orElse(null);
        if (reservation == null) {
            return EntryVerifyResponse.rejected(EntryVerifyResult.INVALID_TOKEN);
        }
        LocalDateTime now = LocalDateTime.now(clock);
        Game game = reservation.getGame();
        LocalDateTime entryOpensAt = entryPolicy.entryOpensAt(game);
        EntryVerifyResult result = judge(reservation, game, entryOpensAt, now);
        if (result == EntryVerifyResult.ADMITTED) {
            reservation.enter(now);
        }
        return EntryVerifyResponse.of(result, ReservationResponse.from(reservation, now), entryOpensAt,
                reservation.getEnteredAt());
    }

    private EntryVerifyResult judge(Reservation reservation, Game game, LocalDateTime entryOpensAt,
            LocalDateTime now) {
        if (game.getStatus() == GameStatus.CANCELED) {
            return EntryVerifyResult.GAME_CANCELED;
        }
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            return EntryVerifyResult.NOT_CONFIRMED;
        }
        if (entryPolicy.isOver(game, now)) {
            return EntryVerifyResult.GAME_OVER;
        }
        if (now.isBefore(entryOpensAt)) {
            return EntryVerifyResult.NOT_YET_OPEN;
        }
        if (reservation.hasEntered()) {
            return EntryVerifyResult.ALREADY_ENTERED;
        }
        return EntryVerifyResult.ADMITTED;
    }
}
