import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Reservation, Team } from '../api/types'
import { countAll, attendedGames } from '../lib/calendar'
import { attendanceStats } from '../lib/attendance'
import { ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'

/**
 * 마이페이지. 헤더의 "OO님"을 누르면 여기로 온다.
 *
 * 직관 횟수는 팀원이 만든 lib/calendar.ts의 attendedGames()를 재사용한다.
 * 승률은 관심 구단이 나온, 결과(FINISHED)가 있는 경기만 센다 — lib/attendance.ts 참고.
 */
export function MyPage() {
  const { member, updateMember } = useAuth()

  const [teams, setTeams] = useState<Team[] | null>(null)
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.getTeams(controller.signal), api.getMyReservations(controller.signal)])
      .then(([teamList, reservationList]) => {
        setTeams(teamList)
        setReservations(reservationList)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '마이페이지 정보를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [])

  if (!member) return null

  const handleSelectTeam = async (teamId: number | null) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateFavoriteTeam(teamId)
      updateMember(updated)
    } catch (e) {
      setError(errorMessage(e, '관심 구단을 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

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
    <div className="mypage">
      <h1 className="page-title">마이페이지</h1>

      <section className="panel mypage__profile">
        <p className="mypage__name">{member.name}님</p>
        <p className="mypage__email">{member.email}</p>
      </section>

      {error && <ErrorMessage message={error} />}

      <div className="mypage__grid">
        <section className="panel mypage__card" aria-labelledby="mypage-favorite-team">
          <h2 id="mypage-favorite-team" className="panel__title">
            관심 구단
          </h2>
          {teams === null ? (
            <Loading label="구단 목록을 불러오는 중…" />
          ) : (
            <div className="mypage__teams" role="group" aria-labelledby="mypage-favorite-team">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className="mypage__team"
                  aria-pressed={member.favoriteTeamId === team.id}
                  aria-label={team.name}
                  disabled={saving}
                  onClick={() => handleSelectTeam(member.favoriteTeamId === team.id ? null : team.id)}
                >
                  <TeamMark team={team} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel mypage__card" aria-labelledby="mypage-attendance">
          <h2 id="mypage-attendance" className="panel__title">
            직관 기록 &amp; 승률
          </h2>
          {attendedCount === null || stats === null ? (
            <Loading label="예매 내역을 불러오는 중…" />
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
      </div>
    </div>
  )
}
