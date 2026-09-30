import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory, Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { ErrorMessage, Loading } from '../components/StatusView'
import { TeamBanner } from '../components/TeamBanner'
import { TeamBoard } from '../components/TeamBoard'
import { TeamStrip } from '../components/TeamStrip'
import { DEFAULT_POST_CATEGORY, parsePostCategory } from '../lib/postCategory'
import './CommunityBoardPage.css'

/** 게시판 바탕에 섞는 구단 색 비율(%). 관심 구단 테마(7%)보다 조금 진하게. */
const TEAM_BG_MIX_PERCENT = 10

/** 관심 구단을 정하는 곳. 비회원은 로그인한 뒤 그리로 간다. */
const FAVORITE_SETTING_PATH = '/my/account'

/**
 * 커뮤니티. 위에는 구단 줄(가운데 관심 구단 고정), 아래에는 고른 구단의 게시판.
 * /community 로 들어오면 관심 구단(없으면 첫 구단), /community/:teamId 로 들어오면 그 구단을 보여 준다.
 * 고른 구단과 분류는 주소에 남겨, 글을 보다가 목록으로 돌아와도 그대로다.
 */
export function CommunityBoardPage() {
  const { teamId } = useParams<{ teamId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { member } = useAuth()

  const [teams, setTeams] = useState<Team[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const favoriteTeam = teams?.find((team) => team.id === member?.favoriteTeamId) ?? null
  const selectedId = teamId !== undefined ? Number(teamId) : (favoriteTeam?.id ?? teams?.[0]?.id ?? null)
  const selectedTeam = teams?.find((team) => team.id === selectedId) ?? null
  const teamColor = selectedTeam?.primaryColor ?? null

  // 보고 있는 구단 게시판에 들어가면 페이지 바탕을 그 구단 색으로 옅게 물들인다. 게시판을 떠나면 원래대로.
  // (관심 구단 테마의 바탕보다 앞선다. 글자·카드가 읽히도록 구단 색은 조금만 섞는다)
  useEffect(() => {
    if (!teamColor) return undefined
    const root = document.documentElement
    root.style.setProperty('--bg', `color-mix(in srgb, ${teamColor} ${TEAM_BG_MIX_PERCENT}%, #f6f7fa)`)
    return () => {
      root.style.removeProperty('--bg')
    }
  }, [teamColor])

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

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null)
          setReloadKey((key) => key + 1)
        }}
      />
    )
  }
  if (teams === null) return <Loading />

  const category = parsePostCategory(searchParams.get('category'))

  const selectTeam = (id: number) => {
    // 구단을 바꿔도 보던 분류는 유지한다. 줄에서 이리저리 눌러 본 것은 방문 기록에 쌓지 않는다.
    const query = category === DEFAULT_POST_CATEGORY ? '' : `?category=${category}`
    navigate(`/community/${id}${query}`, { replace: true })
  }

  const changeCategory = (next: PostCategory) => {
    setSearchParams(next === DEFAULT_POST_CATEGORY ? {} : { category: next }, { replace: true })
  }

  const settingPath = member
    ? FAVORITE_SETTING_PATH
    : `/login?redirect=${encodeURIComponent(FAVORITE_SETTING_PATH)}`

  return (
    <div className="community">
      <TeamStrip
        teams={teams}
        favoriteTeam={favoriteTeam}
        selectedTeamId={selectedId}
        onSelect={selectTeam}
        favoriteSettingPath={settingPath}
      />

      {selectedTeam && <TeamBanner team={selectedTeam} />}

      {selectedId !== null && (
        <TeamBoard
          key={`${selectedId}:${category}`}
          teamId={selectedId}
          team={selectedTeam}
          category={category}
          onCategoryChange={changeCategory}
          canWrite={member !== null}
        />
      )}
    </div>
  )
}
