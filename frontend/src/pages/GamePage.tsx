import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameDetail, HoldResult, PaymentMethod, SeatPosition, SeatStatus, SeatSummary } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { HoldCountdown } from '../components/HoldCountdown'
import { SeatLegend, SeatMap } from '../components/SeatMap'
import { StadiumMap } from '../components/StadiumMap'
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
} from '../lib/format'
import { hasStadiumMap } from '../lib/stadiumMap'

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
  // 구장 화면에는 구역별 잔여 수만, 좌석 목록은 선택한 구역만 불러온다.
  const [summary, setSummary] = useState<SeatSummary | null>(null)
  const [sectionStatus, setSectionStatus] = useState<SeatStatus | null>(null)
  const [sectionError, setSectionError] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
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
      .then(setGame)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setLoadError(errorMessage(e, '경기 정보를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [gameId, validGameId])

  const refreshSummary = useCallback(
    (signal?: AbortSignal) =>
      api.getSeatSummary(gameId, signal).then(setSummary, (e: unknown) => {
        // 잔여석 표시는 다음 주기에 다시 시도한다.
        if (!isAbortError(e)) setSummary(null)
      }),
    [gameId],
  )

  const refreshSection = useCallback(
    (sectionId: number | null, signal?: AbortSignal) => {
      if (sectionId === null) return Promise.resolve()
      return api.getSeatStatus(gameId, sectionId, signal).then(
        (status) => {
          setSectionStatus(status)
          setSectionError(false)
        },
        (e: unknown) => {
          if (!isAbortError(e)) setSectionError(true)
        },
      )
    },
    [gameId],
  )

  const refreshSeats = useCallback(
    () => Promise.all([refreshSummary(), refreshSection(activeSectionId)]).then(() => undefined),
    [refreshSummary, refreshSection, activeSectionId],
  )

  // 다른 고객의 선점/판매가 반영되도록 주기적으로 갱신한다.
  useEffect(() => {
    if (!validGameId) return
    const controller = new AbortController()
    void refreshSummary(controller.signal)
    const timer = window.setInterval(() => void refreshSummary(controller.signal), SEAT_REFRESH_INTERVAL_MS)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [validGameId, refreshSummary, isAuthenticated])

  useEffect(() => {
    if (!validGameId || activeSectionId === null) return
    const controller = new AbortController()
    void refreshSection(activeSectionId, controller.signal)
    const timer = window.setInterval(
      () => void refreshSection(activeSectionId, controller.signal),
      SEAT_REFRESH_INTERVAL_MS,
    )
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [validGameId, activeSectionId, refreshSection, isAuthenticated])

  // 구역을 바꾼 직후에는 이전 구역의 좌석 현황이 남아 있으므로 구역이 일치할 때만 사용한다.
  const currentStatus = sectionStatus?.sectionId === activeSectionId ? sectionStatus : null
  const soldKeys = useMemo(() => new Set(currentStatus?.soldSeats), [currentStatus])
  const heldKeys = useMemo(() => new Set(currentStatus?.heldSeats), [currentStatus])

  // 선택해 둔 좌석이 그사이 판매되거나 다른 고객에게 선점되면 선택에서 제외한다.
  const activeSelection = useMemo(
    () =>
      selection.filter((seat) => {
        if (currentStatus === null || seat.sectionId !== currentStatus.sectionId) return true
        const key = seatKey(seat)
        return !soldKeys.has(key) && !heldKeys.has(key)
      }),
    [selection, currentStatus, soldKeys, heldKeys],
  )
  const selectedKeys = useMemo(() => new Set(activeSelection.map(seatKey)), [activeSelection])

  const sectionsById = useMemo(() => new Map(game?.sections.map((section) => [section.id, section])), [game])

  const remainingBySection = useMemo(
    () => new Map(summary?.sections.map((section) => [section.sectionId, section.availableSeats])),
    [summary],
  )

  const selectedBySection = useMemo(() => {
    const counts = new Map<number, number>()
    for (const seat of activeSelection) counts.set(seat.sectionId, (counts.get(seat.sectionId) ?? 0) + 1)
    return counts
  }, [activeSelection])

  const totalPrice = activeSelection.reduce((sum, seat) => sum + (sectionsById.get(seat.sectionId)?.price ?? 0), 0)

  // 1인 예매 한도: 이미 예매한 좌석을 빼고 남은 만큼만 고를 수 있다.
  const seatLimit = summary?.maxSeatsPerMember ?? MAX_SEATS
  const reservedSeats = summary?.myReservedSeats ?? 0
  const remainingQuota = Math.max(0, Math.min(seatLimit, MAX_SEATS) - reservedSeats)
  const quantityOptions = Array.from({ length: remainingQuota }, (_, index) => index + 1)
  const selectableQuantity = Math.min(quantity, Math.max(1, remainingQuota))

  const handleExpire = useCallback(() => {
    setHold(null)
    setNotice('좌석 선점 시간이 만료되었습니다. 좌석을 다시 선택해 주세요.')
    void refreshSeats()
  }, [refreshSeats])

  if (loadError) return <ErrorMessage message={loadError} />
  if (!game) return <Loading label="경기 정보를 불러오는 중…" />

  const bookable = isBookable(game.startAt)
  const activeSection = activeSectionId === null ? undefined : sectionsById.get(activeSectionId)
  const quotaExhausted = isAuthenticated && remainingQuota === 0

  const handleSelectSection = (sectionId: number | null) => {
    setActiveSectionId(sectionId)
    // 구역 선택을 풀면 고르던 좌석도 함께 비운다. (결제 단계에서는 유지)
    if (sectionId === null && hold === null) setSelection([])
  }

  const handleSelectGroup = (seats: SeatPosition[]) => {
    setNotice(null)
    setSelection(seats)
  }

  const handleGroupUnavailable = () => {
    setNotice(`연속된 ${selectableQuantity}석을 찾을 수 없습니다. 다른 자리나 다른 매수를 선택해 주세요.`)
  }

  const removeSeat = (seat: SeatPosition) => {
    setNotice(null)
    setSelection(activeSelection.filter((selected) => seatKey(selected) !== seatKey(seat)))
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
            <section className="panel" aria-label="구역 선택">
              {hasStadiumMap(game.sections) ? (
                <StadiumMap
                  sections={game.sections}
                  activeSectionId={activeSectionId}
                  remainingBySection={remainingBySection}
                  selectedBySection={selectedBySection}
                  onSelect={handleSelectSection}
                />
              ) : (
                <StadiumOverview
                  sections={game.sections}
                  activeSectionId={activeSectionId}
                  remainingBySection={remainingBySection}
                  selectedBySection={selectedBySection}
                  onSelect={handleSelectSection}
                />
              )}
            </section>

            {!activeSection && (
              <section className="panel" aria-labelledby="seat-step-title">
                <h2 id="seat-step-title" className="panel__title">
                  2. 좌석 선택
                </h2>
                <p className="summary__empty">
                  먼저 위 배치도에서 구역을 선택해 주세요. 블록을 누르면 그 구역의 좌석이 나타납니다.
                </p>
              </section>
            )}

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

                {quotaExhausted ? (
                  <p className="quota-hint quota-hint--blocked" role="status">
                    이 경기는 최대 {seatLimit}석까지 예매할 수 있습니다. 이미 {reservedSeats}석을 예매하셨습니다.
                  </p>
                ) : (
                  <div className="seat-toolbar">
                    <div className="quantity-picker" role="group" aria-label="매수 선택">
                      <span className="quantity-picker__label">매수</span>
                      {quantityOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={option === selectableQuantity}
                          disabled={hold !== null || submitting}
                          onClick={() => {
                            setQuantity(option)
                            setSelection([])
                            setNotice(null)
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <p className="quota-hint">
                      좌석에 커서를 올리면 연속된 {selectableQuantity}석이 표시됩니다.
                      {reservedSeats > 0 && ` (이미 ${reservedSeats}석 예매, ${remainingQuota}석 더 선택 가능)`}
                    </p>
                  </div>
                )}

                {currentStatus ? (
                  <SeatMap
                    section={activeSection}
                    soldKeys={soldKeys}
                    heldKeys={heldKeys}
                    selectedKeys={selectedKeys}
                    quantity={selectableQuantity}
                    disabled={hold !== null || submitting || quotaExhausted}
                    onSelectGroup={handleSelectGroup}
                    onClearSelection={() => setSelection([])}
                    onGroupUnavailable={handleGroupUnavailable}
                  />
                ) : sectionError ? (
                  <ErrorMessage
                    message="좌석 현황을 불러오지 못했습니다."
                    onRetry={() => void refreshSection(activeSectionId)}
                  />
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
                <p className="summary__empty">
                  매수를 고르고 좌석 배치도에서 원하는 자리를 선택해 주세요. (한 경기 최대 {seatLimit}석)
                </p>
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
                            onClick={() => removeSeat(seat)}
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
