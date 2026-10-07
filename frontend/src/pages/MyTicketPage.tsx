import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import { formatGameDate, formatTime } from '../lib/format'
import './MyTicketPage.css'

/** 입장용 QR을 새로 그리는 간격 */
const QR_REFRESH_MS = 30_000

/** 서버가 주는 경기 시각(시간대 없음)은 서울 시간이다. */
function startTime(ticket: Reservation): number {
  return Date.parse(`${ticket.game.startAt.slice(0, 19)}+09:00`)
}

const MINUTE = 60_000
/** 입장 시작: 평일은 경기 1시간 30분 전, 주말(토·일)은 2시간 전부터 */
const WEEKDAY_GATE_OPEN_MS = 90 * MINUTE
const WEEKEND_GATE_OPEN_MS = 120 * MINUTE
/** 서버가 경기 종료를 아직 안 알려 줘도, 시작 4시간 뒤에는 끝난 경기로 본다. */
const GAME_LENGTH_MS = 240 * MINUTE

/** 경기 날이 주말(토·일)인지. 경기 시각 문자열이 서울 날짜라 그 날짜로 요일을 구한다. */
function isWeekendGame(ticket: Reservation): boolean {
  const [year, month, day] = ticket.game.startAt.slice(0, 10).split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 || weekday === 6
}

function gateOpenTime(ticket: Reservation): number {
  return startTime(ticket) - (isWeekendGame(ticket) ? WEEKEND_GATE_OPEN_MS : WEEKDAY_GATE_OPEN_MS)
}

function endTime(ticket: Reservation): number {
  return startTime(ticket) + GAME_LENGTH_MS
}

const seoulClock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type EntryStatus = { label: string; tone: 'waiting' | 'open' | 'live' | 'past' | 'canceled' }

/** 지금 시각으로 본 입장 상태 */
function entryStatus(ticket: Reservation, now: number): EntryStatus {
  if (ticket.game.status === 'CANCELED') return { label: '경기 취소', tone: 'canceled' }
  if (ticket.game.status === 'FINISHED' || now >= endTime(ticket)) return { label: '경기 종료', tone: 'past' }
  if (now >= startTime(ticket)) return { label: '경기 중 · 입장 가능', tone: 'live' }
  if (now >= gateOpenTime(ticket)) return { label: '입장 가능', tone: 'open' }
  return { label: `${seoulClock.format(gateOpenTime(ticket))}부터 입장`, tone: 'waiting' }
}

/** 입장 상태가 바뀌는 다음 시각(입장 시작·경기 시작·경기 종료)에 맞춰 다시 그린다. */
function useEntryStatus(ticket: Reservation): EntryStatus {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const next = [gateOpenTime(ticket), startTime(ticket), endTime(ticket)].find((time) => time > now)
    if (next === undefined) return undefined
    // setTimeout은 약 24.8일보다 길게 기다리지 못하므로, 멀면 그때 다시 잰다.
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(next - now + 50, 2 ** 31 - 1))
    return () => window.clearTimeout(timer)
  }, [ticket, now])

  return entryStatus(ticket, now)
}

/** 아직 볼 수 있는 경기인지 (끝났거나 취소된 경기가 아님) */
function isUpcoming(ticket: Reservation, now: number): boolean {
  return ticket.game.status === 'SCHEDULED' && endTime(ticket) > now
}

/** 볼 수 있는 경기를 가까운 순으로 먼저, 끝났거나 취소된 경기는 최근 순으로 그 뒤에 둔다. */
function sortTickets(reservations: Reservation[], now: number): Reservation[] {
  return reservations.toSorted((left, right) => {
    const leftTime = startTime(left)
    const rightTime = startTime(right)
    const leftUpcoming = isUpcoming(left, now)
    const rightUpcoming = isUpcoming(right, now)
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1
    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime
  })
}

type QrState = { image: string | null; expiresAt: number; error: string | null }

/**
 * 30초마다 새로 그리는 입장용 QR. 새로고침 버튼으로 바로 다시 그릴 수도 있다.
 * (지금은 화면에서 그리는 QR이라 입장 검증용 서명은 없다. 실제 입장 확인을 붙이려면 서버가 서명한 값을 받아 그려야 한다)
 */
function useRotatingQr(ticket: Reservation) {
  const [qr, setQr] = useState<QrState>({ image: null, expiresAt: 0, error: null })
  const [round, setRound] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    const issuedAt = Date.now()
    const expiresAt = issuedAt + QR_REFRESH_MS
    const payload = JSON.stringify({
      type: 'BALLPARK_ENTRY_TICKET',
      version: 1,
      reservationId: ticket.id,
      reservationNumber: ticket.reservationNumber,
      issuedAt,
      expiresAt,
      nonce: crypto.randomUUID(),
    })
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: { dark: '#0b1b33', light: '#ffffff' },
    }).then(
      (image) => {
        if (!cancelled) setQr({ image, expiresAt, error: null })
      },
      () => {
        if (!cancelled) setQr((current) => ({ ...current, error: 'QR 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [ticket.id, ticket.reservationNumber, round])

  // 남은 시간을 세다가 다 되면 새로 그린다. (새 QR이 올 때까지는 다시 세지 않는다)
  useEffect(() => {
    if (!qr.expiresAt) return undefined
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= qr.expiresAt) {
        setQr((state) => ({ ...state, expiresAt: 0 }))
        setRound((value) => value + 1)
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [qr.expiresAt])

  const secondsLeft = qr.expiresAt ? Math.max(0, Math.ceil((qr.expiresAt - now) / 1000)) : QR_REFRESH_MS / 1000
  const refresh = () => {
    setQr((state) => ({ ...state, expiresAt: 0 }))
    setRound((value) => value + 1)
  }
  return { ...qr, secondsLeft, refresh }
}

function TicketCard({ ticket, direction }: { ticket: Reservation; direction: 'next' | 'previous' | null }) {
  const { image, error, secondsLeft, refresh } = useRotatingQr(ticket)
  const status = useEntryStatus(ticket)
  const { game } = ticket
  const seatLabel = ticket.seats.map((seat) => `${seat.sectionName} ${seat.rowNo}열 ${seat.seatNo}번`).join(', ')

  return (
    <article className={`my-ticket__card${direction ? ` is-sliding-${direction}` : ''}`} aria-label="QR 티켓">
      <header className="my-ticket__header">
        <div className="my-ticket__brand">SAFETICKET</div>
        <span className={`my-ticket__status is-${status.tone}`}>
          {status.label}
        </span>
      </header>
      <div className="my-ticket__content">
        <p className="my-ticket__league">
          KBO 리그 · {formatGameDate(game.startAt)} {formatTime(game.startAt)}
        </p>
        <div className="my-ticket__matchup">
          <div className="my-ticket__team">
            <span>원정</span>
            <TeamMark team={game.awayTeam} size="lg" />
            <strong>{game.awayTeam.name}</strong>
          </div>
          <span className="my-ticket__versus">VS</span>
          <div className="my-ticket__team">
            <span>홈</span>
            <TeamMark team={game.homeTeam} size="lg" />
            <strong>{game.homeTeam.name}</strong>
          </div>
        </div>
        <p className="my-ticket__stadium">{game.stadium.name}</p>
        <div className="my-ticket__qr-area">
          <div className="my-ticket__qr">
            {image ? <img src={image} alt="입장 확인용 QR 코드" /> : <Loading label="QR 생성 중…" />}
          </div>
          {error ? (
            <p className="my-ticket__qr-error" role="alert">
              {error}
            </p>
          ) : (
            <>
              <p>입장 게이트에서 QR 코드를 제시해 주세요.</p>
              <p className="my-ticket__refresh" role="timer">
                <strong>00:{String(secondsLeft).padStart(2, '0')}</strong> 후 새 QR 코드로 갱신됩니다.
              </p>
            </>
          )}
          <button type="button" className="button button--ghost button--sm" onClick={refresh}>
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
    </article>
  )
}

/**
 * 내 QR 티켓. 헤더의 [내 티켓]이나 예매 상세의 [QR 티켓 보기]로 들어온다.
 * 확정된 예매만 티켓으로 보여 주고, 여러 장이면 좌우 화살표로 넘긴다. 주소의 ?reservationId= 로 처음 볼 티켓을 고른다.
 * (팀원의 feature/my-ticket-link 작업을 지금 화면 구조에 맞춰 옮겼다)
 */
export function MyTicketPage() {
  const [searchParams] = useSearchParams()
  const requestedId = Number(searchParams.get('reservationId'))
  const [tickets, setTickets] = useState<Reservation[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyReservations(controller.signal)
      .then((reservations) => {
        const confirmed = sortTickets(
          reservations.filter((reservation) => reservation.status === 'CONFIRMED'),
          Date.now(),
        )
        setTickets(confirmed)
        setSelectedId((confirmed.find((ticket) => ticket.id === requestedId) ?? confirmed[0])?.id ?? null)
      })
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) setError(errorMessage(cause, '예매 내역을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [requestedId])

  if (error) return <ErrorMessage message={error} />
  if (tickets === null) return <Loading label="내 티켓을 불러오는 중…" />

  const selectedIndex = tickets.findIndex((ticket) => ticket.id === selectedId)
  const selected = tickets[selectedIndex]
  if (!selected) {
    return (
      <section className="empty-ticket" aria-labelledby="empty-ticket-title">
        <h1 id="empty-ticket-title">예매 완료된 티켓이 없습니다.</h1>
        <p>예매를 완료하면 여기에서 입장용 QR 티켓을 확인할 수 있습니다.</p>
        <Link className="button button--primary" to="/">
          경기 일정 보기
        </Link>
      </section>
    )
  }

  const move = (direction: 'next' | 'previous') => {
    const offset = direction === 'next' ? 1 : -1
    setSlideDirection(direction)
    setSelectedId(tickets[(selectedIndex + offset + tickets.length) % tickets.length].id)
  }

  return (
    <section className="my-ticket" aria-labelledby="my-ticket-title">
      <h1 id="my-ticket-title">내 QR 티켓</h1>
      <div className="my-ticket__stage">
        {tickets.length > 1 && (
          <button
            type="button"
            className="my-ticket__nav my-ticket__nav--previous"
            onClick={() => move('previous')}
            aria-label="이전 티켓"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14.5 5-7 7 7 7" />
            </svg>
          </button>
        )}
        <TicketCard key={selected.id} ticket={selected} direction={slideDirection} />
        {tickets.length > 1 && (
          <button
            type="button"
            className="my-ticket__nav my-ticket__nav--next"
            onClick={() => move('next')}
            aria-label="다음 티켓"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9.5 5 7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {tickets.length > 1 && (
        <p className="my-ticket__ticket-count">
          {selectedIndex + 1} / {tickets.length} 티켓
        </p>
      )}
    </section>
  )
}
