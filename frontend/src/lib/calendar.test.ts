import { describe, expect, it } from 'vitest'
import type { Reservation, ReservationStatus, Team } from '../api/types'
import { attendedGames, countAll, countInMonth, monthGrid, shiftMonth } from './calendar'

const team = (id: number, name: string): Team => ({ id, code: name, name, shortName: name, primaryColor: '#123456' })

function reservation(id: number, startAt: string, status: ReservationStatus = 'CONFIRMED'): Reservation {
  return {
    id,
    reservationNumber: `R${id}`,
    status,
    totalPrice: 20000,
    paymentMethod: 'CARD',
    createdAt: '2026-08-01T10:00:00',
    canceledAt: null,
    cancelable: false,
    game: {
      id,
      startAt,
      homeTeam: team(1, 'LG'),
      awayTeam: team(2, '두산'),
      stadium: { id: 1, name: '잠실야구장', city: '서울' },
    },
    seats: [],
  }
}

/** 서울 시각 2026-09-27 12:00 */
const NOW = new Date('2026-09-27T12:00:00+09:00')

describe('monthGrid', () => {
  it('2026년 9월은 화요일에 시작하므로 앞에 빈 칸이 2개 있고 5주다', () => {
    const weeks = monthGrid(2026, 9)

    expect(weeks).toHaveLength(5)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, '2026-09-01'])
    expect(weeks[4].at(-1)).toBeNull()
    expect(weeks.flat().filter(Boolean)).toHaveLength(30)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('일요일에 시작하는 달은 앞에 빈 칸이 없다', () => {
    // 2026-02-01은 일요일, 28일까지라 딱 4주
    const weeks = monthGrid(2026, 2)

    expect(weeks).toHaveLength(4)
    expect(weeks[0][0]).toBe('2026-02-01')
  })

  it('한 자리 월·일은 0을 채운다', () => {
    expect(monthGrid(2026, 3).flat().filter(Boolean)[8]).toBe('2026-03-09')
  })
})

describe('shiftMonth', () => {
  it('12월 다음은 다음 해 1월이다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('1월 이전은 전년 12월이다', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('여러 달도 한 번에 옮긴다', () => {
    expect(shiftMonth(2026, 9, 6)).toEqual({ year: 2027, month: 3 })
  })
})

describe('attendedGames', () => {
  it('확정이고 이미 시작한 경기만 날짜별로 모은다', () => {
    const attended = attendedGames(
      [
        reservation(1, '2026-09-05T18:30:00'),
        reservation(2, '2026-09-10T18:30:00', 'CANCELED'),
        reservation(3, '2026-09-30T18:30:00'),
        reservation(4, '2026-09-20T14:00:00', 'PENDING'),
      ],
      NOW,
    )

    expect([...attended.keys()]).toEqual(['2026-09-05'])
  })

  it('경기 시작 시각이 지금과 같으면 직관으로 본다', () => {
    const attended = attendedGames([reservation(1, '2026-09-27T12:00:00')], NOW)

    expect(attended.has('2026-09-27')).toBe(true)
  })

  it('오늘 경기라도 아직 시작 전이면 직관이 아니다', () => {
    const attended = attendedGames([reservation(1, '2026-09-27T18:30:00')], NOW)

    expect(attended.size).toBe(0)
  })

  it('같은 날 두 경기는 시각순으로 묶는다', () => {
    const attended = attendedGames([reservation(2, '2026-09-05T18:30:00'), reservation(1, '2026-09-05T14:00:00')], NOW)

    expect(attended.get('2026-09-05')?.map((item) => item.id)).toEqual([1, 2])
  })

  it('양도처럼 CONFIRMED가 아닌 새 상태는 자동으로 빠진다', () => {
    const transferred = reservation(1, '2026-09-05T18:30:00', 'TRANSFERRED' as ReservationStatus)

    expect(attendedGames([transferred], NOW).size).toBe(0)
  })
})

describe('countInMonth / countAll', () => {
  const attended = attendedGames(
    [reservation(1, '2026-09-05T18:30:00'), reservation(2, '2026-09-12T17:00:00'), reservation(3, '2026-08-30T18:30:00')],
    NOW,
  )

  it('그 달의 경기만 센다', () => {
    expect(countInMonth(attended, 2026, 9)).toBe(2)
    expect(countInMonth(attended, 2026, 8)).toBe(1)
    expect(countInMonth(attended, 2026, 7)).toBe(0)
  })

  it('전체 경기 수를 센다', () => {
    expect(countAll(attended)).toBe(3)
  })
})
