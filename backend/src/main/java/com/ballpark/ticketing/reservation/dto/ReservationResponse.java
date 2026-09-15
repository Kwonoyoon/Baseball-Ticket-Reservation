package com.ballpark.ticketing.reservation.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.ballpark.ticketing.game.dto.GameSummaryResponse;
import com.ballpark.ticketing.reservation.Reservation;
import com.ballpark.ticketing.reservation.ReservationSeat;
import com.ballpark.ticketing.reservation.ReservationStatus;
import com.ballpark.ticketing.reservation.payment.PaymentMethod;
import com.ballpark.ticketing.stadium.SeatGrade;

public record ReservationResponse(
        Long id,
        String reservationNumber,
        ReservationStatus status,
        int totalPrice,
        PaymentMethod paymentMethod,
        LocalDateTime createdAt,
        LocalDateTime canceledAt,
        boolean cancelable,
        GameSummaryResponse game,
        List<ReservedSeatResponse> seats) {

    public static ReservationResponse from(Reservation reservation, LocalDateTime now) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getReservationNumber(),
                reservation.getStatus(),
                reservation.getTotalPrice(),
                reservation.getPaymentMethod(),
                reservation.getCreatedAt(),
                reservation.getCanceledAt(),
                reservation.isCancelable(now),
                GameSummaryResponse.from(reservation.getGame()),
                reservation.getSeats().stream().map(ReservedSeatResponse::from).toList());
    }

    public record ReservedSeatResponse(
            Long sectionId, String sectionName, SeatGrade grade, int rowNo, int seatNo, int price) {

        static ReservedSeatResponse from(ReservationSeat seat) {
            return new ReservedSeatResponse(seat.getSection().getId(), seat.getSection().getName(),
                    seat.getSection().getGrade(), seat.getRowNo(), seat.getSeatNo(), seat.getPrice());
        }
    }
}
