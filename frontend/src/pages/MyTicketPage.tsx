import { useEffect, useId, useState } from 'react'
import QRCode from 'qrcode'
import { Link, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { EntryTicket, Reservation, ReservedSeat } from '../api/types'
import { ReservedSeatMap } from '../components/ReservedSeatMap'
import { ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import { formatGameDate, formatTime, seatKey } from '../lib/format'
import { stadiumLayout } from '../lib/stadiumMap'
import './MyTicketPage.css'

/** 서버가 주는 시각(시간대 없음)은 서울 시간이다. */
function seoulTime(value: string): number {
  return Date.parse(`${value.slice(0, 19)}+09:00`)
}

/** 정렬에만 쓰는 어림값: 시작 4시간 뒤에는 끝난 경기로 본다. (화면의 입장 상태는 서버가 준 시각으로 정한다) */
const GAME_LENGTH_MS = 4 * 60 * 60_000

/** 아직 볼 수 있는 경기인지 (끝났거나 취소된 경기가 아님) */
function isUpcoming(ticket: Reservation, now: number): boolean {
  return ticket.game.status === 'SCHEDULED' && seoulTime(ticket.game.startAt) + GAME_LENGTH_MS > now
}

/** 볼 수 있는 경기를 가까운 순으로 먼저, 끝났거나 취소된 경기는 최근 순으로 그 뒤에 둔다. */
function sortTickets(reservations: Reservation[], now: number): Reservation[] {
  return reservations.toSorted((left, right) => {
    const leftTime = seoulTime(left.game.startAt)
    const rightTime = seoulTime(right.game.startAt)
    const leftUpcoming = isUpcoming(left, now)
    const rightUpcoming = isUpcoming(right, now)
    if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1
    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime
  })
}

const seoulClock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type EntryStatus = { label: string; tone: 'waiting' | 'open' | 'live' | 'past' | 'canceled' }

const CANCELED_STATUS: EntryStatus = { label: '경기 취소', tone: 'canceled' }

/**
 * 지금 시각으로 본 입장 상태. 입장 시작·경기 시작·종료 시각은 서버가 정한다.
 * (평일은 1시간 30분 전, 주말·공휴일은 2시간 전부터 입장)
 */
function entryStatus(ticket: Reservation, entry: EntryTicket, now: number): EntryStatus {
  if (ticket.game.status === 'CANCELED') return CANCELED_STATUS
  if (ticket.game.status === 'FINISHED' || now >= seoulTime(entry.gameEndsAt)) {
    return { label: '경기 종료', tone: 'past' }
  }
  if (now >= seoulTime(entry.gameStartsAt)) return { label: '경기 중 · 입장 가능', tone: 'live' }
  const opensAt = seoulTime(entry.entryOpensAt)
  if (now >= opensAt) return { label: '입장 가능', tone: 'open' }
  return { label: `${seoulClock.format(opensAt)}부터 입장`, tone: 'waiting' }
}

/** 입장 상태가 바뀌는 다음 시각(입장 시작·경기 시작·경기 종료)에 맞춰 다시 그린다. 입장 정보를 받기 전에는 null */
function useEntryStatus(ticket: Reservation, entry: EntryTicket | null): EntryStatus | null {
  const [now, setNow] = useState(() => Date.now())
  // QR을 30초마다 새로 받아도 시각은 그대로라, 시각 값으로만 다시 잰다. (새 QR마다 타이머를 다시 걸면 영영 안 바뀐다)
  const opensAt = entry?.entryOpensAt
  const startsAt = entry?.gameStartsAt
  const endsAt = entry?.gameEndsAt

  useEffect(() => {
    if (!opensAt || !startsAt || !endsAt) return undefined
    const next = [opensAt, startsAt, endsAt].map(seoulTime).find((time) => time > now)
    if (next === undefined) return undefined
    // 지금 시각에서 다음 경계까지 기다린다. setTimeout은 약 24.8일보다 길게 못 기다려서, 멀면 그때 다시 잰다.
    const delay = Math.min(Math.max(next - Date.now(), 0) + 50, 2 ** 31 - 1)
    const timer = window.setTimeout(() => setNow(Date.now()), delay)
    return () => window.clearTimeout(timer)
  }, [opensAt, startsAt, endsAt, now])

  if (ticket.game.status === 'CANCELED') return CANCELED_STATUS
  return entry ? entryStatus(ticket, entry, now) : null
}

type EntryState = {
  entry: EntryTicket | null
  image: string | null
  /** 새 QR을 받아야 하는 시각(이 기기 시계). 0이면 받는 중이거나 QR이 없다. */
  expiresAt: number
  error: string | null
}

/**
 * 서버가 서명한 입장 QR 값을 받아 그린다. 값은 30초만 유효해서 그때마다 새로 받고, 새로고침 버튼으로 바로 다시 받을 수도 있다.
 * 끝났거나 취소된 경기는 서버가 QR 값을 주지 않는다.
 */
function useEntryTicket(ticket: Reservation) {
  const [state, setState] = useState<EntryState>({ entry: null, image: null, expiresAt: 0, error: null })
  const [round, setRound] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    api
      .issueEntryTicket(ticket.id, controller.signal)
      .then(async (entry) => {
        const image = entry.token
          ? await QRCode.toDataURL(entry.token, {
              errorCorrectionLevel: 'M',
              margin: 2,
              width: 480,
              color: { dark: '#0b1b33', light: '#ffffff' },
            })
          : null
        if (controller.signal.aborted) return
        // 기기 시계가 서버와 달라도 되도록, 유효 시간은 받은 때부터 센다.
        const receivedAt = Date.now()
        const expiresAt = entry.token && entry.expiresInSeconds ? receivedAt + entry.expiresInSeconds * 1000 : 0
        setNow(receivedAt)
        setState({ entry, image, expiresAt, error: null })
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause) || controller.signal.aborted) return
        const error = errorMessage(cause, 'QR 코드를 받지 못했습니다. 잠시 후 다시 시도해 주세요.')
        setState((current) => ({ ...current, image: null, expiresAt: 0, error }))
      })
    return () => controller.abort()
  }, [ticket.id, round])

  // 남은 시간을 세다가 다 되면 새로 받는다. (새 QR이 올 때까지는 다시 세지 않는다)
  useEffect(() => {
    if (!state.expiresAt) return undefined
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= state.expiresAt) {
        setState((value) => ({ ...value, expiresAt: 0 }))
        setRound((value) => value + 1)
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [state.expiresAt])

  const secondsLeft = state.expiresAt
    ? Math.max(0, Math.ceil((state.expiresAt - now) / 1000))
    : (state.entry?.expiresInSeconds ?? 30)
  const refresh = () => {
    setState((value) => ({ ...value, expiresAt: 0, error: null }))
    setRound((value) => value + 1)
  }
  return { ...state, secondsLeft, refresh }
}

type SeatGroup = { sectionId: number; sectionName: string; grade: string; seats: ReservedSeat[] }

/** 한 예매에 여러 구역이 섞일 수 있어 구역별로 묶는다. */
function groupBySection(seats: ReservedSeat[]): SeatGroup[] {
  const groups = new Map<number, SeatGroup>()
  for (const seat of seats) {
    const group = groups.get(seat.sectionId)
    if (group) {
      group.seats.push(seat)
    } else {
      groups.set(seat.sectionId, {
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        grade: seat.grade,
        seats: [seat],
      })
    }
  }
  return [...groups.values()]
}

/**
 * 티켓의 좌석: 구역별로 묶어 열·번을 크게 보여 준다.
 * 구장 배치도가 있으면 [좌석 위치 보기]로 예매 상세의 "내 좌석 위치"와 같은 배치도를 펼치고,
 * 좌석을 누르면 그 블록 안 어디에 앉는지 함께 보여 준다. (배치도의 블록을 눌러도 같은 좌석이 골라진다)
 */
function TicketSeats({ ticket }: { ticket: Reservation }) {
  const [mapOpen, setMapOpen] = useState(false)
  const [openSeat, setOpenSeat] = useState<ReservedSeat | null>(null)
  const titleId = useId()
  const mapId = useId()
  const layout = stadiumLayout(ticket.game.stadium.code)
  const hasMap =
    layout !== null && ticket.seats.some((seat) => layout.blocks.some((block) => block.code === seat.sectionCode))

  const pickSeat = (seat: ReservedSeat) => {
    const isOpen = mapOpen && openSeat !== null && seatKey(openSeat) === seatKey(seat)
    setMapOpen(true)
    setOpenSeat(isOpen ? null : seat)
  }

  return (
    <section className="my-ticket__seats" aria-labelledby={titleId}>
      <div className="my-ticket__seats-head">
        <h2 id={titleId}>
          좌석 <span>{ticket.seats.length}석</span>
        </h2>
        {hasMap && (
          <button
            type="button"
            className="my-ticket__map-toggle"
            aria-expanded={mapOpen}
            aria-controls={mapId}
            onClick={() => setMapOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13" />
            </svg>
            {mapOpen ? '좌석 위치 닫기' : '좌석 위치 보기'}
          </button>
        )}
      </div>
      <ul className="my-ticket__seat-groups">
        {groupBySection(ticket.seats).map((group) => (
          <li key={group.sectionId} className={`my-ticket__seat-group grade--${group.grade.toLowerCase()}`}>
            <p className="my-ticket__seat-section">{group.sectionName}</p>
            <ul className="my-ticket__seat-list">
              {group.seats.map((seat) => {
                const numbers = (
                  <>
                    <span>
                      <strong>{seat.rowNo}</strong>열
                    </span>
                    <span>
                      <strong>{seat.seatNo}</strong>번
                    </span>
                  </>
                )
                const isOpen = mapOpen && openSeat !== null && seatKey(openSeat) === seatKey(seat)
                return (
                  <li key={seatKey(seat)}>
                    {hasMap && seat.sectionCode !== null ? (
                      <button
                        type="button"
                        className={`my-ticket__seat${isOpen ? ' is-open' : ''}`}
                        aria-pressed={isOpen}
                        aria-label={`${seat.sectionName} ${seat.rowNo}열 ${seat.seatNo}번 위치 보기`}
                        onClick={() => pickSeat(seat)}
                      >
                        {numbers}
                      </button>
                    ) : (
                      <span className="my-ticket__seat">{numbers}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
      {hasMap && mapOpen && (
        <div id={mapId} className="my-ticket__map">
          <ReservedSeatMap
            seats={ticket.seats}
            stadiumCode={ticket.game.stadium.code}
            openSeat={openSeat}
            onOpenSeatChange={setOpenSeat}
            showList={false}
          />
          <p className="my-ticket__map-hint">색칠된 블록이나 위의 좌석을 누르면 블록 안 자리가 보여요.</p>
        </div>
      )}
    </section>
  )
}

function TicketCard({ ticket, direction }: { ticket: Reservation; direction: 'next' | 'previous' | null }) {
  const { entry, image, error, secondsLeft, refresh } = useEntryTicket(ticket)
  const status = useEntryStatus(ticket, entry)
  // 끝났거나 취소된 경기는 서버가 QR 값을 주지 않는다.
  const closed = entry !== null && entry.token === null
  const { game } = ticket

  return (
    <article className={`my-ticket__card${direction ? ` is-sliding-${direction}` : ''}`} aria-label="QR 티켓">
      <header className="my-ticket__header">
        <div className="my-ticket__brand">SAFETICKET</div>
        <span className={`my-ticket__status is-${status?.tone ?? 'checking'}`}>{status?.label ?? '확인 중'}</span>
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
          {closed ? (
            <p className="my-ticket__qr-closed">
              {ticket.game.status === 'CANCELED' ? '취소된 경기라 입장 QR이 없습니다.' : '끝난 경기라 입장 QR이 없습니다.'}
            </p>
          ) : (
            <>
              <div className="my-ticket__qr">
                {image ? (
                  <img src={image} alt="입장 확인용 QR 코드" />
                ) : (
                  !error && <Loading label="QR 받는 중…" />
                )}
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
            </>
          )}
        </div>
        <TicketSeats ticket={ticket} />
        <dl className="my-ticket__details">
          <div>
            <dt>예매번호</dt>
            <dd>{ticket.reservationNumber}</dd>
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
