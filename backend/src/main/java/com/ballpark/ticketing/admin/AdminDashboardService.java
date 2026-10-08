package com.ballpark.ticketing.admin;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ballpark.ticketing.admin.dto.AdminDashboardResponse;
import com.ballpark.ticketing.admin.dto.AdminDashboardResponse.Daily;
import com.ballpark.ticketing.admin.dto.AdminDashboardResponse.GameDemand;
import com.ballpark.ticketing.admin.dto.AdminDashboardResponse.Pending;
import com.ballpark.ticketing.admin.dto.AdminDashboardResponse.Today;
import com.ballpark.ticketing.game.Game;
import com.ballpark.ticketing.game.GameStatus;
import com.ballpark.ticketing.member.MemberStatus;
import com.ballpark.ticketing.reservation.ReservationStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * 관리자 대시보드의 숫자를 모은다. 읽기만 하고, 새 테이블은 쓰지 않는다.
 * 날짜 경계는 서버 시계(Clock, 서울 시간)를 따른다.
 *
 * <p>DB가 멀리 있으면 쿼리 한 번마다 왕복 시간이 쌓이므로, 하루씩 따로 세지 않고 최근 7일치를 한 번에 가져와
 * 자바에서 날짜별로 나눈다. 경기별 판매 좌석과 구장별 좌석 수도 묶어서 한 번에 조회한다.
 */
@Service
@Transactional(readOnly = true)
public class AdminDashboardService {

    /** 최근 며칠의 추이를 보여 줄지. 오늘을 포함한다. */
    private static final int TREND_DAYS = 7;
    /** 예매율 순위에 올릴 후보로 앞으로 열릴 경기를 몇 개까지 볼지. */
    private static final int CANDIDATE_GAMES = 30;
    private static final int TOP_GAMES = 5;

    @PersistenceContext
    private EntityManager em;

    private final Clock clock;

    public AdminDashboardService(Clock clock) {
        this.clock = clock;
    }

    public AdminDashboardResponse dashboard() {
        LocalDate today = LocalDate.now(clock);
        LocalDateTime from = today.minusDays(TREND_DAYS - 1L).atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        // 최근 7일 예매(대기 중인 건 제외). 날짜별 건수와 확정 상태인 건의 금액 합계를 자바에서 센다.
        List<Object[]> booked = em.createQuery(
                "select r.createdAt, r.status, r.totalPrice from Reservation r "
                        + "where r.status <> :pending and r.createdAt >= :from and r.createdAt < :end",
                Object[].class)
                .setParameter("pending", ReservationStatus.PENDING)
                .setParameter("from", from).setParameter("end", end)
                .getResultList();
        List<LocalDateTime> canceledAt = em.createQuery(
                "select r.canceledAt from Reservation r where r.canceledAt >= :from and r.canceledAt < :end",
                LocalDateTime.class)
                .setParameter("from", from).setParameter("end", end)
                .getResultList();

        Map<LocalDate, long[]> perDay = new HashMap<>(); // [예매 건수, 취소 건수, 매출]
        for (Object[] row : booked) {
            long[] day = perDay.computeIfAbsent(((LocalDateTime) row[0]).toLocalDate(), d -> new long[3]);
            day[0]++;
            if (row[1] == ReservationStatus.CONFIRMED) {
                day[2] += (Integer) row[2];
            }
        }
        for (LocalDateTime at : canceledAt) {
            perDay.computeIfAbsent(at.toLocalDate(), d -> new long[3])[1]++;
        }

        List<Daily> last7Days = new ArrayList<>();
        for (int i = TREND_DAYS - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            long[] day = perDay.getOrDefault(date, new long[3]);
            last7Days.add(new Daily(date, day[0], day[1], day[2]));
        }
        Daily todayDaily = last7Days.get(last7Days.size() - 1);

        LocalDateTime start = today.atStartOfDay();
        long newMembers = em.createQuery(
                "select count(m) from Member m where m.createdAt >= :s and m.createdAt < :e", Long.class)
                .setParameter("s", start).setParameter("e", end).getSingleResult();
        long entered = em.createQuery(
                "select count(r) from Reservation r where r.enteredAt >= :s and r.enteredAt < :e", Long.class)
                .setParameter("s", start).setParameter("e", end).getSingleResult();
        Today todayStats = new Today(todayDaily.reservations(), todayDaily.canceled(), todayDaily.revenue(),
                newMembers, entered);

        long reports = em.createQuery("select count(c) from CommunityReport c", Long.class).getSingleResult();
        long locked = em.createQuery("select count(m) from Member m where m.status = :status", Long.class)
                .setParameter("status", MemberStatus.LOCKED).getSingleResult();
        long total = em.createQuery("select count(m) from Member m where m.status <> :status", Long.class)
                .setParameter("status", MemberStatus.WITHDRAWN).getSingleResult();

        return new AdminDashboardResponse(today, todayStats, new Pending(reports, locked, total), last7Days,
                topGames());
    }

    /** 앞으로 열릴 경기 중 예매율이 높은 순. 좌석 수는 구장의 활성 구역(줄 수 x 줄당 좌석)을 더해 구한다. */
    private List<GameDemand> topGames() {
        List<Game> games = em.createQuery(
                "select g from Game g join fetch g.homeTeam join fetch g.awayTeam "
                        + "where g.status = :status and g.startAt >= :now order by g.startAt",
                Game.class)
                .setParameter("status", GameStatus.SCHEDULED)
                .setParameter("now", LocalDateTime.now(clock))
                .setMaxResults(CANDIDATE_GAMES)
                .getResultList();
        if (games.isEmpty()) {
            return List.of();
        }

        Set<Long> gameIds = games.stream().map(Game::getId).collect(Collectors.toSet());
        Set<Long> stadiumIds = games.stream().map(game -> game.getStadium().getId()).collect(Collectors.toSet());

        Map<Long, Long> soldByGame = new HashMap<>();
        for (Object[] row : em.createQuery(
                "select rs.reservation.game.id, count(rs) from ReservationSeat rs "
                        + "where rs.reservation.status = :confirmed and rs.reservation.game.id in :gameIds "
                        + "group by rs.reservation.game.id",
                Object[].class)
                .setParameter("confirmed", ReservationStatus.CONFIRMED)
                .setParameter("gameIds", gameIds)
                .getResultList()) {
            soldByGame.put((Long) row[0], (Long) row[1]);
        }

        Map<Long, Long> capacityByStadium = new HashMap<>();
        for (Object[] row : em.createQuery(
                "select s.stadium.id, sum(s.seatRows * s.seatsPerRow) from SeatSection s "
                        + "where s.active = true and s.stadium.id in :stadiumIds group by s.stadium.id",
                Object[].class)
                .setParameter("stadiumIds", stadiumIds)
                .getResultList()) {
            capacityByStadium.put((Long) row[0], ((Number) row[1]).longValue());
        }

        List<GameDemand> demands = new ArrayList<>();
        for (Game game : games) {
            long capacity = capacityByStadium.getOrDefault(game.getStadium().getId(), 0L);
            long sold = soldByGame.getOrDefault(game.getId(), 0L);
            // 소수 둘째 자리까지. 정수로 반올림하면 좌석이 많은 구장에서 전부 0%로 보인다.
            double rate = capacity > 0 ? Math.min(100.0, Math.round(sold * 10000.0 / capacity) / 100.0) : 0.0;
            demands.add(new GameDemand(game.getId(), game.getHomeTeam().getName(), game.getAwayTeam().getName(),
                    game.getStartAt(), sold, capacity, rate));
        }
        return demands.stream()
                .sorted(Comparator.comparingDouble(GameDemand::rate).reversed()
                        .thenComparing(Comparator.comparingLong(GameDemand::sold).reversed())
                        .thenComparing(GameDemand::startAt))
                .limit(TOP_GAMES)
                .toList();
    }
}
