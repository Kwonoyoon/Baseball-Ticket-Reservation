import type { Reservation } from '../api/types'
import { attendedGames } from './calendar'

export type AttendanceStats = {
  /** 관심 구단이 참여한, 결과가 나온 직관 경기 수 */
  decided: number
  wins: number
  losses: number
}

/**
 * 관심 구단 기준 직관 승률. 결과(FINISHED)가 없는 경기, 관심 구단이 안 나온 경기는 세지 않는다.
 * 무승부는 이론상 없지만(연장 규정) 방어적으로 승패 어디에도 넣지 않는다.
 */
export function attendanceStats(reservations: Reservation[], favoriteTeamId: number | null): AttendanceStats {
  const stats: AttendanceStats = { decided: 0, wins: 0, losses: 0 }
  if (favoriteTeamId === null) return stats

  for (const reservationsOnDate of attendedGames(reservations).values()) {
    for (const { game } of reservationsOnDate) {
      if (game.status !== 'FINISHED' || game.homeScore === null || game.awayScore === null) continue
      const favoriteIsHome = game.homeTeam.id === favoriteTeamId
      const favoriteIsAway = game.awayTeam.id === favoriteTeamId
      if (!favoriteIsHome && !favoriteIsAway) continue
      if (game.homeScore === game.awayScore) continue

      const favoriteScore = favoriteIsHome ? game.homeScore : game.awayScore
      const opponentScore = favoriteIsHome ? game.awayScore : game.homeScore
      stats.decided += 1
      if (favoriteScore > opponentScore) stats.wins += 1
      else stats.losses += 1
    }
  }
  return stats
}
