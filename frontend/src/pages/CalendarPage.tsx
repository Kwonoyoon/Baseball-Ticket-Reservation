import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'
import { attendedGames, countAll, countInMonth, monthGrid, shiftMonth } from '../lib/calendar'
import { formatGameDate, formatTime, todayInSeoul } from '../lib/format'
import './CalendarPage.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 직관 캘린더. 사이드바의 "직관 캘린더"가 새 창(팝업)으로 여는 화면이라 공용 Layout(헤더·푸터) 밖에 있다.
 * 취소했거나 아직 시작하지 않은 경기는 표시하지 않는다. (기준은 lib/calendar.ts의 attendedGames)
 */
export function CalendarPage() {
  const today = todayInSeoul()
  const [visible, setVisible] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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

  const attended = useMemo(() => (reservations ? attendedGames(reservations) : null), [reservations])

  const moveMonth = (delta: number) => {
    setVisible((current) => shiftMonth(current.year, current.month, delta))
    setSelectedDate(null)
  }

  const selectedGames = (selectedDate && attended?.get(selectedDate)) || []

  return (
    <div className="calendar-page">
      <h1 className="page-title">직관 캘린더</h1>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : attended === null ? (
        <Loading label="직관 기록을 불러오는 중…" />
      ) : (
        <>
          <section className="calendar" aria-label="직관 달력">
            <div className="calendar__nav">
              <button type="button" className="icon-button" aria-label="이전 달" onClick={() => moveMonth(-1)}>
                ‹
              </button>
              <h2 className="calendar__month">
                {visible.year}년 {visible.month}월
              </h2>
              <button type="button" className="icon-button" aria-label="다음 달" onClick={() => moveMonth(1)}>
                ›
              </button>
            </div>

            <p className="calendar__summary">
              이 달에 <strong>{countInMonth(attended, visible.year, visible.month)}경기</strong> 직관했어요
              <span> · 전체 {countAll(attended)}경기</span>
            </p>

            <table className="calendar__grid">
              <thead>
                <tr>
                  {WEEKDAYS.map((weekday, column) => (
                    <th key={weekday} scope="col" className={weekdayClass(column)}>
                      {weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(visible.year, visible.month).map((week, row) => (
                  <tr key={row}>
                    {week.map((date, column) => (
                      <td key={column} className={weekdayClass(column)}>
                        {date && (
                          <DayCell
                            date={date}
                            isToday={date === today}
                            count={attended.get(date)?.length ?? 0}
                            selected={date === selectedDate}
                            onSelect={() => setSelectedDate(date === selectedDate ? null : date)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedDate ? (
            <section className="calendar-detail" aria-label={`${formatGameDate(selectedDate)} 직관 경기`}>
              <h2 className="calendar-detail__title">{formatGameDate(selectedDate)}</h2>
              <ul className="calendar-detail__list">
                {selectedGames.map((reservation) => (
                  <li key={reservation.id} className="calendar-detail__item">
                    <strong>
                      {reservation.game.awayTeam.name} vs {reservation.game.homeTeam.name}
                    </strong>
                    <span>
                      {formatTime(reservation.game.startAt)} · {reservation.game.stadium.name} · {reservation.seats.length}석
                    </span>
                    <Link to={`/reservations/${reservation.id}`}>예매 상세</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="calendar-hint">
              {countAll(attended) === 0
                ? '아직 직관한 경기가 없습니다. 예매한 경기가 시작되면 이 달력에 표시돼요.'
                : '색이 채워진 날짜를 누르면 그날 다녀온 경기를 볼 수 있어요.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function weekdayClass(column: number): string | undefined {
  if (column === 0) return 'is-sun'
  if (column === 6) return 'is-sat'
  return undefined
}

type DayCellProps = {
  date: string
  isToday: boolean
  count: number
  selected: boolean
  onSelect: () => void
}

function DayCell({ date, isToday, count, selected, onSelect }: DayCellProps) {
  const day = Number(date.slice(8))
  const classes = ['calendar__day', isToday && 'is-today', count > 0 && 'is-attended'].filter(Boolean).join(' ')

  // 직관한 날만 누를 수 있다. 나머지는 눌러도 보여 줄 게 없으니 버튼으로 만들지 않는다.
  if (count === 0) return <span className={classes}>{day}</span>

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={selected}
      aria-label={`${formatGameDate(date)}, 직관 ${count}경기`}
      onClick={onSelect}
    >
      {day}
      {count > 1 && <span className="calendar__count">{count}</span>}
    </button>
  )
}
