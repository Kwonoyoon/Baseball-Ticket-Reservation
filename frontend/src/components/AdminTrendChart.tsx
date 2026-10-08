import { useId } from 'react'
import type { AdminDashboard } from '../api/types'
import { formatPrice } from '../lib/format'
import './AdminTrendChart.css'

type Day = AdminDashboard['last7Days'][number]

const WIDTH = 560
const HEIGHT = 250
const PAD = { left: 40, right: 20, top: 28, bottom: 44 }
const GRID_LINES = 4
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** y축 맨 위 값. 눈금이 정수로 나뉘게 4의 배수로 올린다. (최소 4) */
function niceMax(max: number): number {
  return Math.max(GRID_LINES, Math.ceil(max / GRID_LINES) * GRID_LINES)
}

function weekdayOf(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]
}

/**
 * 최근 7일 예매 추이 그래프. 외부 차트 라이브러리 없이 SVG로 그린다.
 * 예매 건수는 영역 그래프, 취소가 있었다면 점선으로 겹쳐 보여 주고, 맨 오른쪽(오늘)을 강조한다.
 * 마우스를 올리면(툴팁) 그날의 예매·취소·매출이 나온다.
 */
export function AdminTrendChart({ days }: { days: Day[] }) {
  const gradientId = useId()
  const totalReservations = days.reduce((sum, day) => sum + day.reservations, 0)
  const totalCanceled = days.reduce((sum, day) => sum + day.canceled, 0)
  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0)

  const yMax = niceMax(Math.max(0, ...days.map((day) => Math.max(day.reservations, day.canceled))))
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (days.length > 1 ? (plotWidth * index) / (days.length - 1) : plotWidth / 2)
  const y = (value: number) => PAD.top + plotHeight * (1 - value / yMax)
  const baseline = y(0)

  const line = (pick: (day: Day) => number) =>
    days.map((day, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(pick(day)).toFixed(1)}`).join(' ')
  const reservationLine = line((day) => day.reservations)
  const area = `${reservationLine} L${x(days.length - 1).toFixed(1)} ${baseline} L${x(0).toFixed(1)} ${baseline} Z`

  const ticks = Array.from({ length: GRID_LINES + 1 }, (_, i) => (yMax / GRID_LINES) * i)
  const lastIndex = days.length - 1

  return (
    <div className="admin-trend">
      <dl className="admin-trend__summary">
        <div>
          <dt>7일 예매</dt>
          <dd>{totalReservations.toLocaleString()}건</dd>
        </div>
        <div>
          <dt>7일 취소</dt>
          <dd>{totalCanceled.toLocaleString()}건</dd>
        </div>
        <div>
          <dt>7일 매출</dt>
          <dd>{formatPrice(totalRevenue)}</dd>
        </div>
      </dl>

      <svg
        className="admin-trend__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`최근 7일 예매 추이. 합계 예매 ${totalReservations}건, 취소 ${totalCanceled}건`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line className="admin-trend__grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="admin-trend__tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} className="admin-trend__area" />
        {totalCanceled > 0 && <path d={line((day) => day.canceled)} className="admin-trend__line-canceled" />}
        <path d={reservationLine} className="admin-trend__line" />

        {days.map((day, index) => {
          const isToday = index === lastIndex
          return (
            <g key={day.date}>
              <title>{`${day.date} 예매 ${day.reservations}건 · 취소 ${day.canceled}건 · 매출 ${formatPrice(day.revenue)}`}</title>
              {/* 마우스를 올리기 쉽게 넓은 투명 영역을 깐다. */}
              <rect x={x(index) - 22} y={PAD.top} width="44" height={plotHeight + 20} fill="transparent" />
              {isToday && <line className="admin-trend__today-guide" x1={x(index)} x2={x(index)} y1={PAD.top} y2={baseline} />}
              <circle
                className={`admin-trend__point${isToday ? ' is-today' : ''}`}
                cx={x(index)}
                cy={y(day.reservations)}
                r={isToday ? 6 : 4}
              />
              <text
                className={`admin-trend__value${isToday ? ' is-today' : ''}`}
                x={x(index)}
                y={y(day.reservations) - 12}
                textAnchor="middle"
              >
                {day.reservations}
              </text>
              <text className={`admin-trend__label${isToday ? ' is-today' : ''}`} x={x(index)} y={HEIGHT - 22} textAnchor="middle">
                {day.date.slice(5).replace('-', '/')}
              </text>
              <text className="admin-trend__weekday" x={x(index)} y={HEIGHT - 8} textAnchor="middle">
                {isToday ? '오늘' : weekdayOf(day.date)}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="admin-trend__legend">
        <span className="admin-trend__legend-item is-reservation">예매</span>
        {totalCanceled > 0 && <span className="admin-trend__legend-item is-canceled">취소</span>}
      </p>
    </div>
  )
}
