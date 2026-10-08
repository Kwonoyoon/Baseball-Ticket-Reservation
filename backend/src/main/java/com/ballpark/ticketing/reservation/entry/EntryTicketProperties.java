package com.ballpark.ticketing.reservation.entry;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 입장 QR 설정.
 *
 * @param secret          입장 QR 서명 키. 32바이트 이상이어야 한다.
 * @param tokenValidity   QR 하나가 유효한 시간. 지나면 화면이 새 QR을 받아 그린다. (캡처해 둔 QR을 못 쓰게)
 * @param weekdayGateOpen 평일 경기는 시작 이만큼 전부터 입장
 * @param holidayGateOpen 주말·공휴일 경기는 시작 이만큼 전부터 입장
 * @param gameLength      경기 결과가 아직 기록되지 않아도, 시작 이만큼 뒤에는 끝난 경기로 본다.
 * @param extraHolidays   {@link PublicHolidays}에 없는 임시공휴일
 */
@ConfigurationProperties(prefix = "ticketing.entry-ticket")
public record EntryTicketProperties(
        String secret,
        @DefaultValue("30s") Duration tokenValidity,
        @DefaultValue("90m") Duration weekdayGateOpen,
        @DefaultValue("120m") Duration holidayGateOpen,
        @DefaultValue("4h") Duration gameLength,
        @DefaultValue List<LocalDate> extraHolidays) {
}
