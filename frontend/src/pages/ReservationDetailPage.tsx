import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { ReservationTicket } from '../components/ReservationTicket'
import { ReservedSeatMap } from '../components/ReservedSeatMap'
import { ErrorMessage, Loading } from '../components/StatusView'
import { openCalendarWindow } from '../lib/calendarWindow'

export function ReservationDetailPage() {
  const params = useParams()
  const reservationId = Number(params.reservationId)
  const location = useLocation()
  const justBooked = (location.state as { justBooked?: boolean } | null)?.justBooked === true

  const validReservationId = Number.isInteger(reservationId) && reservationId > 0

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!validReservationId) return
    const controller = new AbortController()
    api
      .getReservation(reservationId, controller.signal)
      .then(setReservation)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '예매 정보를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reservationId, validReservationId])

  if (!validReservationId) return <ErrorMessage message="잘못된 예매 주소입니다." />
  if (error) return <ErrorMessage message={error} />
  if (!reservation) return <Loading label="예매 정보를 불러오는 중…" />

  return (
    <div className="reservation-detail">
      {justBooked ? (
        <section className="success-banner">
          <span className="success-banner__icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <h1>예매가 완료되었습니다</h1>
            <p>경기 당일 예매번호를 매표소 또는 입장 게이트에서 확인해 주세요.</p>
            <p>
              직관 캘린더에 예정으로 기록됐어요.{' '}
              <button type="button" className="link-button" onClick={openCalendarWindow}>
                캘린더에서 보기
              </button>
            </p>
          </div>
        </section>
      ) : (
        <h1 className="page-title">예매 상세</h1>
      )}

      <ReservationTicket reservation={reservation} />

      {/* 배치도가 없는 구역만 예매했다면 카드 자체를 띄우지 않는다. */}
      {reservation.seats.some((seat) => seat.sectionCode !== null) && (
        <section className="panel seat-location-card" aria-labelledby="seat-location-title">
          <h2 id="seat-location-title" className="panel__title">
            내 좌석 위치
          </h2>
          <ReservedSeatMap seats={reservation.seats} stadiumCode={reservation.game.stadium.code} />
        </section>
      )}

      <div className="page-actions">
        <Link className="button button--ghost" to="/my/reservations">
          예매 내역 보기
        </Link>
        <Link className="button button--primary" to="/">
          다른 경기 보기
        </Link>
      </div>
    </div>
  )
}
