import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Loading } from './StatusView'
import { TeamMark } from './TeamMark'

/** 마이페이지의 관심 구단 설정. 구단 로고를 누르면 바로 저장되고, 같은 구단을 다시 누르면 해제된다. */
export function FavoriteTeamPanel() {
  const { member, updateMember } = useAuth()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getTeams(controller.signal)
      .then(setTeams)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError('구단 목록을 불러오지 못했습니다.')
      })
    return () => controller.abort()
  }, [])

  if (!member) return null

  const handleSelect = async (teamId: number | null) => {
    setSaving(true)
    setError(null)
    try {
      updateMember(await api.updateFavoriteTeam(teamId))
    } catch (e) {
      setError(errorMessage(e, '관심 구단을 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel mypage__card" aria-labelledby="mypage-favorite-team">
      <h2 id="mypage-favorite-team" className="panel__title">
        관심 구단
      </h2>
      {teams === null ? (
        error ? (
          <p className="mypage__placeholder">{error}</p>
        ) : (
          <Loading label="구단 목록을 불러오는 중…" />
        )
      ) : (
        <>
          <div className="mypage__teams" role="group" aria-labelledby="mypage-favorite-team">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className="mypage__team"
                aria-pressed={member.favoriteTeamId === team.id}
                aria-label={team.name}
                disabled={saving}
                onClick={() => handleSelect(member.favoriteTeamId === team.id ? null : team.id)}
              >
                <TeamMark team={team} />
              </button>
            ))}
          </div>
          {error && <p className="mypage__placeholder">{error}</p>}
        </>
      )}
    </section>
  )
}
