import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameDetail, HoldResult, PaymentMethod, SeatPosition, SeatStatus } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { HoldCountdown } from '../components/HoldCountdown'
import { SeatLegend, SeatMap } from '../components/SeatMap'
import { StadiumOverview } from '../components/StadiumOverview'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import {
  formatGameDate,
  formatPrice,
  formatTime,
  isBookable,
  MAX_SEATS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  seatKey,
  sectionIdOfSeatKey,
} from '../lib/format'

const SEAT_REFRESH_INTERVAL_MS = 10_000
/** 선점이 풀려 좌석을 처음부터 다시 골라야 하는 오류 */
const HOLD_LOST_CODES = ['HOLD_EXPIRED', 'SEAT_ALREADY_SOLD', 'BOOKING_CLOSED']

export function GamePage() {
  const params = useParams()
  const gameId = Number(params.gameId)
  const validGameId = Number.isInteger(gameId) && gameId > 0
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [game, setGame] = useState<GameDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(validGameId ? null : '잘못된 경기 주소입니다.')
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null)
  const [seatError, setSeatError] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const [selection, setSelection] = useState<SeatPosition[]>([])
  const [hold, setHold] = useState<HoldResult | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!validGameId) return
    const controller = new AbortController()
    api
      .getGame(gameId, controller.signal)
      .then((detail) => {
        setGame(detail)
        setActiveSectionId((current) => current ?? detail.sections[0]?.id ?? null)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setLoadError(errorMessage(e, '경기 정보를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [gameId, validGameId])

  const refreshSeats = useCallback(
    (signal?: AbortSignal) =>
      api.getSeatStatus(gameId, signal).then(
        (status) => {
          setSeatStatus(status)
          setSeatError(false)
        },
        (e: unknown) => {
          if (!isAbortError(e)) setSeatError(true)
        },
      ),
    [gameId],
  )

  // 다른 고객의 선점/판매가 반영되도록 주기적으로 좌석 현황을 갱신한다.
  useEffect(() => {
    if (!validGameId) return
    const controller = new AbortController()
    void refreshSeats(controller.signal)
    const timer = window.setInterval(() => void refreshSeats(controller.signal), SEAT_REFRESH_INTERVAL_MS)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [validGameId, refreshSeats, isAuthenticated])

  const soldKeys = useMemo(() => new Set(seatStatus?.soldSeats), [seatStatus])
  const heldKeys = useMemo(() => new Set(seatStatus?.heldSeats), [seatStatus])

  // 선택해 둔 좌석이 그사이 판매되거나 다른 고객에게 선점되면 선택에서 제외한다.
  const activeSelection = useMemo(
    () => selection.filter((seat) => !soldKeys.has(seatKey(seat)) && !heldKeys.has(seatKey(seat))),
    [selection, soldKeys, heldKeys],
  )
  const selectedKeys = useMemo(() => new Set(activeSelection.map(seatKey)), [activeSelection])

  const sectionsById = useMemo(() => new Map(game?.sections.map((section) => [section.id, section])), [game])

  const remainingBySection = useMemo(() => {
    const taken = new Map<number, number>()
    for (const key of [...soldKeys, ...heldKeys]) {
      const sectionId = sectionIdOfSeatKey(key)
      taken.set(sectionId, (taken.get(sectionId) ?? 0) + 1)
    }
    return new Map(
      game?.sections.map((section) => [
        section.id,
        section.seatRows * section.seatsPerRow - (taken.get(section.id) ?? 0),
      ]),
    )
  }, [game, soldKeys, heldKeys])

  const selectedBySection = useMemo(() => {
    const counts = new Map<number, number>()
    for (const seat of activeSelection) counts.set(seat.sectionId, (counts.get(seat.sectionId) ?? 0) + 1)
    return counts
  }, [activeSelection])

  const totalPrice = activeSelection.reduce((sum, seat) => sum + (sectionsById.get(seat.sectionId)?.price ?? 0), 0)

  const handleExpire = useCallback(() => {
    setHold(null)
    setNotice('좌석 선점 시간이 만료되었습니다. 좌석을 다시 선택해 주세요.')
    void refreshSeats()
  }, [refreshSeats])

  if (loadError) return <ErrorMessage message={loadError} />
  if (!game) return <Loading label="경기 정보를 불러오는 중…" />

  const bookable = isBookable(game.startAt)
  const activeSection = activeSectionId === null ? undefined : sectionsById.get(activeSectionId)

  const toggleSeat = (seat: SeatPosition) => {
    setNotice(null)
    const key = seatKey(seat)
    if (selectedKeys.has(key)) {
      setSelection(activeSelection.filter((selected) => seatKey(selected) !== key))
      return
    }
    if (activeSelection.length >= MAX_SEATS) {
      setNotice(`한 번에 최대 ${MAX_SEATS}석까지 선택할 수 있습니다.`)
      return
    }
    setSelection([...activeSelection, seat])
  }

  const handleHold = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/games/${gameId}`)}`)
      return
    }
    setSubmitting(true)
    setNotice(null)
    try {
      setHold(await api.holdSeats(gameId, activeSelection))
    } catch (e) {
      setNotice(errorMessage(e, '좌석을 선점하지 못했습니다.'))
      void refreshSeats()
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async () => {
    setSubmitting(true)
    setNotice(null)
    try {
      const reservation = await api.reserve({ gameId, seats: activeSelection, paymentMethod })
      navigate(`/reservations/${reservation.id}`, { state: { justBooked: true } })
    } catch (e) {
      setNotice(errorMessage(e, '결제를 완료하지 못했습니다.'))
      if (e instanceof ApiError && HOLD_LOST_CODES.includes(e.code)) setHold(null)
      void refreshSeats()
      setSubmitting(false)
    }
  }

  const handleReselect = async () => {
    setHold(null)
    setNotice(null)
    try {
      await api.releaseSeats(gameId)
    } catch {
      // 해제에 실패해도 선점은 만료 시간이 지나면 자동으로 풀린다.
    }
    void refreshSeats()
  }

  const bannerStyle = {
    '--home-color': game.homeTeam.primaryColor,
    '--away-color': game.awayTeam.primaryColor,
  } as CSSProperties

  return (
    <div className="game-page">
      <Link to={`/?date=${game.startAt.slice(0, 10)}`} className="back-link">
        ← 경기 일정
      </Link>

      <section className="game-banner" style={bannerStyle}>
        <div className="game-banner__teams">
          <div className="game-banner__team">
            <TeamMark team={game.awayTeam} size="lg" />
            <span>{game.awayTeam.name}</span>
            <small>원정</small>
          </div>
          <span className="game-banner__vs">VS</span>
          <div className="game-banner__team">
            <TeamMark team={game.homeTeam} size="lg" />
            <span>{game.homeTeam.name}</span>
            <small>홈</small>
          </div>
        </div>
        <h1 className="game-banner__info">
          {formatGameDate(game.startAt)} {formatTime(game.startAt)} · {game.stadium.name}
        </h1>
      </section>

      {!bookable ? (
        <EmptyState title="예매가 마감된 경기입니다." description="경기 시작 이후에는 예매할 수 없습니다.">
          <Link className="button button--ghost" to="/">
            다른 경기 보기
          </Link>
        </EmptyState>
      ) : (
        <div className="booking">
          <div className="booking__main">
            <section className="panel" aria-labelledby="section-step-title">
              <h2 id="section-step-title" className="panel__title">
                1. 구역 선택
              </h2>
              <StadiumOverview
                sections={game.sections}
                activeSectionId={activeSectionId}
                remainingBySection={remainingBySection}
                selectedBySection={selectedBySection}
                onSelect={setActiveSectionId}
              />
            </section>

            {activeSection && (
              <section className="panel" aria-labelledby="seat-step-title">
                <div className="panel__header">
                  <h2 id="seat-step-title" className="panel__title">
                    2. 좌석 선택
                    <span className="panel__subtitle">
                      {activeSection.name} · {formatPrice(activeSection.price)}
                    </span>
                  </h2>
                  <SeatLegend />
                </div>
                {seatStatus ? (
                  <SeatMap
                    section={activeSection}
                    soldKeys={soldKeys}
                    heldKeys={heldKeys}
                    selectedKeys={selectedKeys}
                    disabled={hold !== null || submitting}
                    onToggle={toggleSeat}
                  />
                ) : seatError ? (
                  <ErrorMessage message="좌석 현황을 불러오지 못했습니다." onRetry={() => void refreshSeats()} />
                ) : (
                  <Loading label="좌석 현황을 불러오는 중…" />
                )}
              </section>
            )}
          </div>

          <aside className="booking__side">
            <section className="panel summary" aria-labelledby="summary-title">
              <h2 id="summary-title" className="panel__title">
                {hold ? '3. 결제' : '선택한 좌석'}
              </h2>

              {activeSelection.length === 0 ? (
                <p className="summary__empty">좌석 배치도에서 원하는 좌석을 선택해 주세요. (최대 {MAX_SEATS}석)</p>
              ) : (
                <ul className="summary__seats">
                  {activeSelection.map((seat) => {
                    const section = sectionsById.get(seat.sectionId)
                    return (
                      <li key={seatKey(seat)}>
                        <span>
                          <strong>{section?.name}</strong> {seat.rowNo}열 {seat.seatNo}번
                        </span>
                        <span>{section && formatPrice(section.price)}</span>
                        {!hold && (
                          <button
                            type="button"
                            className="summary__remove"
                            aria-label={`${section?.name} ${seat.rowNo}열 ${seat.seatNo}번 선택 해제`}
                            onClick={() => toggleSeat(seat)}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="summary__total">
                <span>총 결제 금액</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              {notice && (
                <p className="notice" role="alert">
                  {notice}
                </p>
              )}

              {hold ? (
                <>
                  <HoldCountdown key={hold.expiresAt} expiresAt={hold.expiresAt} onExpire={handleExpire} />
                  <fieldset className="payment-methods" disabled={submitting}>
                    <legend>결제 수단</legend>
                    {PAYMENT_METHODS.map((method) => (
                      <label key={method} className="payment-method">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={() => setPaymentMethod(method)}
                        />
                        {PAYMENT_METHOD_LABELS[method]}
                      </label>
                    ))}
                  </fieldset>
                  <p className="summary__hint">가상 결제로 진행되며 실제 금액은 청구되지 않습니다.</p>
                  <button
                    type="button"
                    className="button button--primary button--block"
                    disabled={submitting || activeSelection.length === 0}
                    onClick={handlePay}
                  >
                    {submitting ? '결제 처리 중…' : `${formatPrice(totalPrice)} 결제하기`}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--block"
                    disabled={submitting}
                    onClick={handleReselect}
                  >
                    좌석 다시 선택
                  </button>
                </>
              ) : (
                <>
                  {!isAuthenticated && (
                    <p className="summary__hint">좌석 선점과 결제는 로그인 후 이용할 수 있습니다.</p>
                  )}
                  <button
                    type="button"
                    className="button button--primary button--block"
                    disabled={submitting || activeSelection.length === 0}
                    onClick={handleHold}
                  >
                    {submitting ? '좌석 확인 중…' : isAuthenticated ? '선택 완료 · 결제하기' : '로그인하고 예매하기'}
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
