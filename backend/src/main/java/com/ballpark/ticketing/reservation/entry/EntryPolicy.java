package com.ballpark.ticketing.reservation.entry;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameStatus;

/**
 * 언제부터 언제까지 입장할 수 있는지 정한다.
 * 평일은 경기 1시간 30분 전, 주말·공휴일은 2시간 전부터 입장하고, 경기가 끝나기 전까지 입장할 수 있다.
 */
@Component
public class EntryPolicy {

    private final EntryTicketProperties properties;
    private final Set<LocalDate> extraHolidays;

    public EntryPolicy(EntryTicketProperties properties) {
        this.properties = properties;
        this.extraHolidays = Set.copyOf(properties.extraHolidays());
    }

    /** 주말(토·일)이거나 공휴일인지 */
    public boolean isHoliday(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY
                || PublicHolidays.contains(date) || extraHolidays.contains(date);
    }

    public LocalDateTime entryOpensAt(Game game) {
        LocalDateTime startAt = game.getStartAt();
        return startAt.minus(isHoliday(startAt.toLocalDate())
                ? properties.holidayGateOpen()
                : properties.weekdayGateOpen());
    }

    public LocalDateTime gameEndsAt(Game game) {
        return game.getStartAt().plus(properties.gameLength());
    }

    /** 경기가 끝났는지 (결과가 기록됐거나, 시작 후 경기 시간이 지났거나) */
    public boolean isOver(Game game, LocalDateTime now) {
        return game.getStatus() == GameStatus.FINISHED || !now.isBefore(gameEndsAt(game));
    }
}
