import { useEffect, useState } from 'react'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { attendanceStats } from '../lib/attendance'
import { attendedGames, countAll } from '../lib/calendar'
import { Loading } from './StatusView'

/**
 * 마이페이지의 직관 기록 & 승률.
 * 직관 횟수는 직관 캘린더와 같은 기준(lib/calendar.ts의 attendedGames)을 쓰고,
 * 승률은 관심 구단이 나온, 결과(FINISHED)가 입력된 경기만 센다. (lib/attendance.ts)
 */
export function AttendancePanel() {
  const { member } = useAuth()
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyReservations(controller.signal)
      .then(setReservations)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setFailed(true)
      })
    return () => controller.abort()
  }, [])

  if (!member) return null

  const attendedCount = reservations ? countAll(attendedGames(reservations)) : null
  const stats = reservations ? attendanceStats(reservations, member.favoriteTeamId) : null
  // 야구는 승률을 "0.706" 대신 ".706"처럼 소수점 앞자리를 뗀 3자리로 표기한다. 전승(1.000)만 예외로 앞자리를 남긴다.
  const winRateText =
    stats && stats.decided > 0
      ? stats.wins === stats.decided
        ? '1.000'
        : (stats.wins / stats.decided).toFixed(3).slice(1)
      : null

  return (
    <section className="panel mypage__card" aria-labelledby="mypage-attendance">
      <h2 id="mypage-attendance" className="panel__title">
        직관 기록 &amp; 승률
      </h2>
      {attendedCount === null || stats === null ? (
        failed ? (
          <p className="mypage__placeholder">직관 기록을 불러오지 못했습니다.</p>
        ) : (
          <Loading label="예매 내역을 불러오는 중…" />
        )
      ) : (
        <>
          <p className="mypage__stat">
            총 <strong>{attendedCount}</strong>경기 직관
          </p>
          {member.favoriteTeamId === null ? (
            <p className="mypage__placeholder">관심 구단을 정하면 승률을 볼 수 있어요.</p>
          ) : winRateText === null ? (
            <p className="mypage__placeholder">아직 결과가 나온 경기가 없습니다.</p>
          ) : (
            <p className="mypage__stat">
              {stats.wins}승 {stats.losses}패 · 승률 <strong>{winRateText}</strong>
            </p>
          )}
        </>
      )}
    </section>
  )
}
