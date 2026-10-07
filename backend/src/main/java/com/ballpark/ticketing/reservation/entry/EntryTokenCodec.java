package com.ballpark.ticketing.reservation.entry;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * 입장 QR에 담는 값(서명한 JWT)을 만들고 검증한다. 화면은 이 값을 그대로 QR로 그리기만 하므로,
 * 서버 키 없이 예매번호를 바꾸거나 유효 시간을 늘린 QR은 검증에서 걸러진다.
 */
@Component
public class EntryTokenCodec {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_TYPE = "typ";
    private static final String ENTRY_TYPE = "entry";
    private static final String CLAIM_RESERVATION_NUMBER = "rno";

    private final SecretKey key;
    private final EntryTicketProperties properties;
    private final Clock clock;

    public EntryTokenCodec(EntryTicketProperties properties, Clock clock) {
        String secret = properties.secret() == null ? "" : properties.secret();
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("ticketing.entry-ticket.secret은 최소 32바이트 이상이어야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(Long reservationId, String reservationNumber) {
        Instant now = clock.instant();
        String token = Jwts.builder()
                .subject(String.valueOf(reservationId))
                .claim(CLAIM_TYPE, ENTRY_TYPE)
                .claim(CLAIM_RESERVATION_NUMBER, reservationNumber)
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.tokenValidity())))
                .signWith(key)
                .compact();
        return new IssuedToken(token, properties.tokenValidity().toSeconds());
    }

    /** 서명·종류·유효 시간을 검증한다. */
    public ParseResult parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String reservationNumber = claims.get(CLAIM_RESERVATION_NUMBER, String.class);
            if (!ENTRY_TYPE.equals(claims.get(CLAIM_TYPE, String.class)) || reservationNumber == null) {
                return ParseResult.INVALID;
            }
            return new ParseResult(new EntryClaims(Long.valueOf(claims.getSubject()), reservationNumber), false);
        } catch (ExpiredJwtException e) {
            return ParseResult.EXPIRED;
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            return ParseResult.INVALID;
        }
    }

    /** @param expiresInSeconds 발급 뒤 유효한 초. 화면은 기기 시계와 상관없이 이만큼 뒤에 새 QR을 받는다. */
    public record IssuedToken(String token, long expiresInSeconds) {
    }

    public record EntryClaims(Long reservationId, String reservationNumber) {
    }

    /** claims가 null이면 검증 실패. expired는 서명은 맞지만 유효 시간이 지난 경우 */
    public record ParseResult(EntryClaims claims, boolean expired) {

        static final ParseResult INVALID = new ParseResult(null, false);
        static final ParseResult EXPIRED = new ParseResult(null, true);
    }
}
