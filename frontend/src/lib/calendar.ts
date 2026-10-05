import type { Reservation } from '../api/types'
import { parseSeoulDateTime } from './format'

const pad = (value: number) => String(value).padStart(2, '0')

/** 달력 한 달치를 일요일 시작의 주(week) 단위로 만든다. 달 밖의 칸은 null이다. month는 1~12. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  // UTC로 계산해야 브라우저 시간대에 따라 하루씩 밀리지 않는다. (format.ts와 같은 방식)
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad(month)}-${pad(day)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7))
  }
  return weeks
}

/** 12월 다음은 다음 해 1월, 1월 이전은 전년 12월이 되도록 달을 옮긴다. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** 예매를 경기 날짜(YYYY-MM-DD)별로 묶고, 같은 날 안에서는 시작 시각 순으로 정렬한다. */
function groupByDate(reservations: Reservation[]): Map<string, Reservation[]> {
  const byDate = new Map<string, Reservation[]>()

  for (const reservation of reservations) {
    const date = reservation.game.startAt.slice(0, 10)
    byDate.set(date, [...(byDate.get(date) ?? []), reservation])
  }

  for (const games of byDate.values()) {
    games.sort((a, b) => a.game.startAt.localeCompare(b.game.startAt))
  }
  return byDate
}

const hasStarted = (reservation: Reservation, now: Date) =>
  parseSeoulDateTime(reservation.game.startAt).getTime() <= now.getTime()

/**
 * 직관을 다녀온 경기만 날짜(YYYY-MM-DD)별로 모은다.
 *
 * "직관"의 기준은 두 가지다.
 *  - 예매가 확정(CONFIRMED) 상태일 것 → 취소한 예매는 빠지고, 나중에 양도 같은 상태가 생겨도 자동으로 빠진다.
 *  - 경기가 이미 시작했을 것 → 아직 오지 않은 경기는 "예매"이지 "직관"이 아니다. (그건 scheduledGames)
 * 상태를 "CONFIRMED가 아니면 제외"가 아니라 "CONFIRMED만 포함"으로 잡은 이유가 이것이다.
 */
export function attendedGames(reservations: Reservation[], now: Date = new Date()): Map<string, Reservation[]> {
  return groupByDate(reservations.filter((r) => r.status === 'CONFIRMED' && hasStarted(r, now)))
}

/**
 * 예매는 했지만 아직 시작하지 않은 경기. 예매하는 순간 캘린더에 "예정"으로 남기려고 쓴다.
 * 상태 기준은 attendedGames와 같고(CONFIRMED만), 시작 시각 기준만 반대라서 두 결과는 겹치지 않는다.
 */
export function scheduledGames(reservations: Reservation[], now: Date = new Date()): Map<string, Reservation[]> {
  return groupByDate(reservations.filter((r) => r.status === 'CONFIRMED' && !hasStarted(r, now)))
}

/** 해당 달(year, month)에 속한 날짜의 경기 수를 센다. */
export function countInMonth(attended: Map<string, Reservation[]>, year: number, month: number): number {
  const prefix = `${year}-${pad(month)}-`
  let count = 0
  for (const [date, games] of attended) {
    if (date.startsWith(prefix)) count += games.length
  }
  return count
}

export function countAll(attended: Map<string, Reservation[]>): number {
  let count = 0
  for (const games of attended.values()) count += games.length
  return count
}
