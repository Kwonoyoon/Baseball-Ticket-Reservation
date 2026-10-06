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
        /** 결제 대기(PENDING)일 때만 값이 있다. 이 시각까지 결제창에서 결제를 마쳐야 한다. */
        LocalDateTime paymentDeadline,
        GameSummaryResponse game,
        List<ReservedSeatResponse> seats) {

    public static ReservationResponse from(Reservation reservation, LocalDateTime now) {
        return from(reservation, now, null);
    }

    public static ReservationResponse from(Reservation reservation, LocalDateTime now, LocalDateTime paymentDeadline) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getReservationNumber(),
                reservation.getStatus(),
                reservation.getTotalPrice(),
                reservation.getPaymentMethod(),
                reservation.getCreatedAt(),
                reservation.getCanceledAt(),
                reservation.isCancelable(now),
                paymentDeadline,
                GameSummaryResponse.from(reservation.getGame()),
                reservation.getSeats().stream().map(ReservedSeatResponse::from).toList());
    }

    /**
     * sectionCode는 좌석 배치도의 블록 코드다. 배치도가 없는 구역은 null이라 화면에서 배치도를 생략한다.
     * seatRows·seatsPerRow는 블록 안 어디에 앉는지 그리는 데 쓴다.
     */
    public record ReservedSeatResponse(
            Long sectionId, String sectionCode, String sectionName, SeatGrade grade, int rowNo, int seatNo,
            int seatRows, int seatsPerRow, int price) {

        static ReservedSeatResponse from(ReservationSeat seat) {
            return new ReservedSeatResponse(seat.getSection().getId(), seat.getSection().getZoneCode(),
                    seat.getSection().getName(), seat.getSection().getGrade(), seat.getRowNo(), seat.getSeatNo(),
                    seat.getSection().getSeatRows(), seat.getSection().getSeatsPerRow(), seat.getPrice());
        }
    }
}
