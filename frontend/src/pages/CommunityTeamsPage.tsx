import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Team } from '../api/types'
import { MessageIcon } from '../components/icons'
import { TeamMark } from '../components/TeamMark'
import { ErrorMessage, Loading } from '../components/StatusView'

/** 커뮤니티 입구. 구단을 고르면 그 구단 게시판으로 들어간다. 카드마다 실제 글 수를 보여 줘야 "게시판"으로 읽힌다. */
export function CommunityTeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  // 구단ID -> 글 수. 글이 하나도 없는 구단은 응답에 안 나오므로 기본값 0으로 조회한다.
  const [postCounts, setPostCounts] = useState<Map<number, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.getTeams(controller.signal), api.getTeamPostCounts(controller.signal)])
      .then(([teamList, counts]) => {
        setTeams(teamList)
        setPostCounts(new Map(counts.map((c) => [c.teamId, c.postCount])))
      })
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
              <span className="community-teams__count">
                <MessageIcon />
                게시글 {postCounts.get(team.id) ?? 0}개
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
