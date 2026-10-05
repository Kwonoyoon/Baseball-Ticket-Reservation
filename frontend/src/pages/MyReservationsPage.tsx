import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { ReservationTicket } from '../components/ReservationTicket'
import { ReservedSeatMap } from '../components/ReservedSeatMap'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { openCalendarWindow } from '../lib/calendarWindow'
import { formatPrice } from '../lib/format'

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [transferringId, setTransferringId] = useState<number | null>(null)
  // 상세는 페이지를 옮기지 않고 카드 아래에 펼친다.
  const [openId, setOpenId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyReservations(controller.signal)
      .then(setReservations)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '예매 내역을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  const handleCancel = async (reservation: Reservation) => {
    const confirmed = window.confirm(
      `예매번호 ${reservation.reservationNumber}를 취소할까요?\n취소한 좌석은 다른 고객에게 다시 판매됩니다.`,
    )
    if (!confirmed) return

    setCancelingId(reservation.id)
    setNotice(null)
    try {
      const updated = await api.cancelReservation(reservation.id)
      setReservations((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? null)
      setNotice({ type: 'success', message: '예매가 취소되었습니다. 결제 금액은 가상 결제로 환불 처리됩니다.' })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '예매를 취소하지 못했습니다.') })
    } finally {
      setCancelingId(null)
    }
  }

  // 양도글을 올리면 그 예매는 취소할 수 없다. (서버가 막는다) 마켓 화면에서 거둘 수 있다.
  const handleTransfer = async (reservation: Reservation) => {
    const confirmed = window.confirm(
      `예매번호 ${reservation.reservationNumber}를 정가 ${formatPrice(reservation.totalPrice)}에 양도 등록할까요?
등록 중에는 이 예매를 취소할 수 없고, 팔리면 결제가 환불됩니다.`,
    )
    if (!confirmed) return

    setTransferringId(reservation.id)
    setNotice(null)
    try {
      await api.registerTransfer(reservation.id)
      setNotice({ type: 'success', message: '양도 등록했습니다. 양도 마켓에서 확인하고 거둘 수 있어요.' })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '양도 등록하지 못했습니다.') })
    } finally {
      setTransferringId(null)
    }
  }

  return (
    <div className="my-reservations">
      <h1 className="page-title">예매 확인 / 취소</h1>
      <p className="my-reservations__calendar">
        확정된 예매는 직관 캘린더에 예정으로 기록돼요.{' '}
        <button type="button" className="link-button" onClick={openCalendarWindow}>
          캘린더에서 보기
        </button>
      </p>

      {notice && (
        <p className={`notice${notice.type === 'success' ? ' notice--success' : ''}`} role="status">
          {notice.message}
        </p>
      )}

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : reservations === null ? (
        <Loading label="예매 내역을 불러오는 중…" />
      ) : reservations.length === 0 ? (
        <EmptyState title="아직 예매한 경기가 없습니다." description="경기 일정에서 보고 싶은 경기를 골라 보세요.">
          <Link className="button button--primary" to="/">
            경기 일정 보기
          </Link>
        </EmptyState>
      ) : (
        <ul className="ticket-list">
          {reservations.map((reservation) => (
            <li key={reservation.id}>
              <ReservationTicket
                reservation={reservation}
                actions={
                  <>
                    <button
                      type="button"
                      className="button button--ghost button--sm"
                      aria-expanded={openId === reservation.id}
                      aria-controls={`reservation-detail-${reservation.id}`}
                      onClick={() => setOpenId((current) => (current === reservation.id ? null : reservation.id))}
                    >
                      {openId === reservation.id ? '좌석 닫기' : '좌석 보기'}
                    </button>
                    {reservation.cancelable && (
                      <button
                        type="button"
                        className="button button--ghost button--sm"
                        disabled={transferringId === reservation.id}
                        onClick={() => handleTransfer(reservation)}
                      >
                        {transferringId === reservation.id ? '등록 중…' : '양도 등록'}
                      </button>
                    )}
                    {reservation.cancelable && (
                      <button
                        type="button"
                        className="button button--ghost button--sm button--danger"
                        disabled={cancelingId === reservation.id}
                        onClick={() => handleCancel(reservation)}
                      >
                        {cancelingId === reservation.id ? '취소 중…' : '예매 취소'}
                      </button>
                    )}
                  </>
                }
              />

              {openId === reservation.id && (
                <section
                  id={`reservation-detail-${reservation.id}`}
                  className="panel ticket-detail"
                  aria-label={`예매번호 ${reservation.reservationNumber} 좌석 위치`}
                >
                  {reservation.seats.some((seat) => seat.sectionCode !== null) ? (
                    <ReservedSeatMap seats={reservation.seats} />
                  ) : (
                    <p className="summary__empty">이 구장은 좌석 배치도가 없습니다.</p>
                  )}
                </section>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
