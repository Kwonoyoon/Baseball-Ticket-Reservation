import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Team } from '../api/types'
import { TeamMark } from '../components/TeamMark'
import { ErrorMessage, Loading } from '../components/StatusView'

/** 커뮤니티 입구. 구단을 고르면 그 구단 게시판으로 들어간다. */
export function CommunityTeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getTeams(controller.signal)
      .then(setTeams)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '구단 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  return (
    <div className="community-teams">
      <h1 className="page-title">커뮤니티</h1>
      <p className="page-subtitle">응원하는 구단을 골라 게시판으로 들어가세요.</p>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : teams === null ? (
        <Loading />
      ) : (
        <div className="community-teams__grid">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/community/${team.id}`}
              className="community-teams__item"
              style={{ '--team-color': team.primaryColor } as CSSProperties}
            >
              <span className="community-teams__glow" aria-hidden="true" />
              <span className="community-teams__logo">
                <TeamMark team={team} size="lg" />
              </span>
              <span className="community-teams__name">{team.name}</span>
              <span className="community-teams__cta">게시판 보기 →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
