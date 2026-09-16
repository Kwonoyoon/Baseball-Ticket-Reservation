import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import { formatGameDate, formatTime } from '../lib/format'

const QR_REFRESH_MS = 30_000

export function MyTicketPage() {
  const [tickets, setTickets] = useState<Reservation[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyReservations(controller.signal)
      .then((reservations) => {
        const confirmed = reservations.filter((reservation) => reservation.status === 'CONFIRMED')
        setTickets(confirmed)
        setSelectedId(confirmed[0]?.id ?? null)
      })
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) setError(errorMessage(cause, '예매 내역을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [])

  const ticket = useMemo(() => tickets?.find((item) => item.id === selectedId) ?? null, [tickets, selectedId])

  const generateQr = async () => {
    if (!ticket) return
    const issuedAt = Date.now()
    const nextExpiresAt = issuedAt + QR_REFRESH_MS
    setExpiresAt(nextExpiresAt)
    setSecondsLeft(30)
    const payload = JSON.stringify({
      type: 'BALLPARK_ENTRY_TICKET',
      version: 1,
      reservationId: ticket.id,
      reservationNumber: ticket.reservationNumber,
      issuedAt,
      expiresAt: nextExpiresAt,
      nonce: crypto.randomUUID(),
    })
    setQrImage(
      await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 480,
        color: { dark: '#0b1b33', light: '#ffffff' },
      }),
    )
  }

  useEffect(() => {
    setQrImage(null)
    generateQr().catch(() => setError('QR 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'))
    // 선택한 예매가 달라질 때만 새 QR을 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setSecondsLeft(seconds)
      if (expiresAt > 0 && seconds === 0) generateQr().catch(() => setError('QR 코드를 갱신하지 못했습니다.'))
    }, 250)
    return () => window.clearInterval(timer)
    // generateQr는 ticket 상태를 사용하므로 티켓이 바뀔 때 새 타이머를 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, ticket?.id])

  if (error) return <ErrorMessage message={error} />
  if (tickets === null) return <Loading label="내 티켓을 불러오는 중…" />
  if (!ticket) {
    return (
      <section className="empty-ticket">
        <h1>예매 완료된 티켓이 없습니다.</h1>
        <p>예매를 완료하면 여기에서 입장용 QR 티켓을 확인할 수 있습니다.</p>
        <Link className="button button--primary" to="/">
          경기 일정 보기
        </Link>
      </section>
    )
  }

  const { game } = ticket
  const seatLabel = ticket.seats.map((seat) => `${seat.sectionName} ${seat.rowNo}열 ${seat.seatNo}번`).join(', ')

  return (
    <section className="my-ticket" aria-labelledby="my-ticket-title">
      <header className="my-ticket__header">
        <div className="my-ticket__brand">볼파크 티켓</div>
        <span className="my-ticket__status">입장 가능</span>
      </header>

      <div className="my-ticket__content">
        <p className="my-ticket__league">KBO 리그 · {formatGameDate(game.startAt)} {formatTime(game.startAt)}</p>
        <h1 id="my-ticket-title">내 QR 티켓</h1>

        {tickets.length > 1 && (
          <label className="my-ticket__picker">
            다른 티켓
            <select value={ticket.id} onChange={(event) => setSelectedId(Number(event.target.value))}>
              {tickets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.game.awayTeam.shortName} vs {item.game.homeTeam.shortName} · {formatGameDate(item.game.startAt)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="my-ticket__matchup">
          <div className="my-ticket__team">
            <span>원정</span>
            <TeamMark team={game.awayTeam} size="lg" />
            <strong>{game.awayTeam.name}</strong>
          </div>
          <span className="my-ticket__versus">경기 전</span>
          <div className="my-ticket__team">
            <span>홈</span>
            <TeamMark team={game.homeTeam} size="lg" />
            <strong>{game.homeTeam.name}</strong>
          </div>
        </div>
        <p className="my-ticket__stadium">{game.stadium.name}</p>

        <div className="my-ticket__qr-area">
          <div className="my-ticket__qr">{qrImage ? <img src={qrImage} alt="입장 확인용 QR 코드" /> : <Loading label="QR 생성 중…" />}</div>
          <p>입장 게이트에서 QR 코드를 제시해 주세요.</p>
          <p className="my-ticket__refresh"><strong>00:{String(secondsLeft).padStart(2, '0')}</strong> 후 새 QR 코드로 갱신됩니다.</p>
          <button type="button" className="button button--ghost button--sm" onClick={() => generateQr()}>
            ↻ 새로고침
          </button>
        </div>

        <dl className="my-ticket__details">
          <div>
            <dt>예매번호</dt>
            <dd>{ticket.reservationNumber}</dd>
          </div>
          <div>
            <dt>좌석</dt>
            <dd>{seatLabel}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
