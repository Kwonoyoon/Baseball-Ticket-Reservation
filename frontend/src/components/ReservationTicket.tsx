import type { ReactNode } from 'react'
import type { Reservation } from '../api/types'
import {
  formatDateTime,
  formatGameDate,
  formatPrice,
  formatTime,
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
} from '../lib/format'
import { TeamMark } from './TeamMark'

type ReservationTicketProps = {
  reservation: Reservation
  actions?: ReactNode
}

export function ReservationTicket({ reservation, actions }: ReservationTicketProps) {
  const { game } = reservation
  const status = reservation.status.toLowerCase()

  return (
    <article className={`ticket ticket--${status}`}>
      <div className="ticket__main">
        <div className="ticket__head">
          <span className={`badge badge--${status}`}>{RESERVATION_STATUS_LABELS[reservation.status]}</span>
          <span className="ticket__number">예매번호 {reservation.reservationNumber}</span>
        </div>
        <h3 className="ticket__matchup">
          <TeamMark team={game.awayTeam} />
          {game.awayTeam.name}
          <span className="ticket__vs">vs</span>
          {game.homeTeam.name}
          <TeamMark team={game.homeTeam} />
        </h3>
        <p className="ticket__info">
          {formatGameDate(game.startAt)} {formatTime(game.startAt)} · {game.stadium.name}
        </p>
        <ul className="ticket__seats" aria-label="예매 좌석">
          {reservation.seats.map((seat) => (
            <li key={`${seat.sectionId}-${seat.rowNo}-${seat.seatNo}`}>
              {seat.sectionName} {seat.rowNo}열 {seat.seatNo}번
            </li>
          ))}
        </ul>
      </div>

      <div className="ticket__stub">
        <dl>
          <div>
            <dt>결제 금액</dt>
            <dd>{formatPrice(reservation.totalPrice)}</dd>
          </div>
          <div>
            <dt>결제 수단</dt>
            <dd>{PAYMENT_METHOD_LABELS[reservation.paymentMethod]}</dd>
          </div>
          <div>
            <dt>예매 일시</dt>
            <dd>{formatDateTime(reservation.createdAt)}</dd>
          </div>
          {reservation.canceledAt && (
            <div>
              <dt>취소 일시</dt>
              <dd>{formatDateTime(reservation.canceledAt)}</dd>
            </div>
          )}
        </dl>
        {actions && <div className="ticket__actions">{actions}</div>}
      </div>
    </article>
  )
}
