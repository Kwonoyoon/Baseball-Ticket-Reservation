import { describe, expect, it } from 'vitest'
import type { GameStatus, Reservation, ReservationStatus, Team } from '../api/types'
import { attendanceStats } from './attendance'

const team = (id: number, name: string): Team => ({ id, code: name, name, shortName: name, primaryColor: '#123456' })

const LG = team(1, 'LG')
const DOOSAN = team(2, '두산')
const KIA = team(3, 'KIA')

function reservation(
  id: number,
  startAt: string,
  home: Team,
  away: Team,
  options: { status?: GameStatus; homeScore?: number | null; awayScore?: number | null; resStatus?: ReservationStatus } = {},
): Reservation {
  return {
    id,
    reservationNumber: `R${id}`,
    status: options.resStatus ?? 'CONFIRMED',
    totalPrice: 20000,
    paymentMethod: 'CARD',
    createdAt: '2026-08-01T10:00:00',
    canceledAt: null,
    paymentDeadline: null,
    cancelable: false,
    game: {
      id,
      startAt,
      homeTeam: home,
      awayTeam: away,
      stadium: { id: 1, name: '잠실야구장', city: '서울', code: 'JAMSIL' },
      status: options.status ?? 'SCHEDULED',
      homeScore: options.homeScore ?? null,
      awayScore: options.awayScore ?? null,
    },
    seats: [],
  }
}

// attendedGames()가 내부에서 쓰는 기본 now(실제 시각)보다 항상 과거인 날짜를 고른다.
const PAST = '2020-01-01T18:30:00'

describe('attendanceStats', () => {
  it('관심 구단이 없으면 전부 0이다', () => {
    const reservations = [reservation(1, PAST, LG, DOOSAN, { status: 'FINISHED', homeScore: 5, awayScore: 3 })]
    expect(attendanceStats(reservations, null)).toEqual({ decided: 0, wins: 0, losses: 0 })
  })

  it('관심 구단이 홈으로 이겼으면 승리로 센다', () => {
    const reservations = [reservation(1, PAST, LG, DOOSAN, { status: 'FINISHED', homeScore: 5, awayScore: 3 })]
    expect(attendanceStats(reservations, LG.id)).toEqual({ decided: 1, wins: 1, losses: 0 })
  })

  it('관심 구단이 원정으로 졌으면 패배로 센다', () => {
    const reservations = [reservation(1, PAST, LG, DOOSAN, { status: 'FINISHED', homeScore: 5, awayScore: 3 })]
    expect(attendanceStats(reservations, DOOSAN.id)).toEqual({ decided: 1, wins: 0, losses: 1 })
  })

  it('결과가 아직 없는 경기는 세지 않는다', () => {
    const reservations = [reservation(1, PAST, LG, DOOSAN, { status: 'SCHEDULED' })]
    expect(attendanceStats(reservations, LG.id)).toEqual({ decided: 0, wins: 0, losses: 0 })
  })

  it('관심 구단이 나오지 않은 경기는 세지 않는다', () => {
    const reservations = [reservation(1, PAST, LG, DOOSAN, { status: 'FINISHED', homeScore: 5, awayScore: 3 })]
    expect(attendanceStats(reservations, KIA.id)).toEqual({ decided: 0, wins: 0, losses: 0 })
  })

  it('취소한 예매는 세지 않는다', () => {
    const reservations = [
      reservation(1, PAST, LG, DOOSAN, { status: 'FINISHED', homeScore: 5, awayScore: 3, resStatus: 'CANCELED' }),
    ]
    expect(attendanceStats(reservations, LG.id)).toEqual({ decided: 0, wins: 0, losses: 0 })
  })
})
