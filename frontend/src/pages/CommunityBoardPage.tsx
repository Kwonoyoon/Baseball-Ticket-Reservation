import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory, Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { BackgroundWash } from '../components/BackgroundWash'
import { CheerCrowd } from '../components/CheerCrowd'
import { ErrorMessage } from '../components/StatusView'
import { TeamBanner } from '../components/TeamBanner'
import { TeamBoard } from '../components/TeamBoard'
import { TeamStrip } from '../components/TeamStrip'
import { COMMUNITY_INTRO_MS } from '../lib/communityIntro'
import { DEFAULT_POST_CATEGORY, parsePostCategory } from '../lib/postCategory'
import { buildTeamTheme } from '../lib/teamTheme'
import './CommunityBoardPage.css'

/** 게시판 바탕에 섞는 구단 색 비율(%). 관심 구단 테마(7%)보다 조금 진하게. */
const TEAM_BG_MIX_PERCENT = 10

/** 구단 색을 섞은 게시판 바탕색 */
const teamBackground = (color: string) => `color-mix(in srgb, ${color} ${TEAM_BG_MIX_PERCENT}%, #f6f7fa)`

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

  // 페이지 바탕: 처음엔 흰색. 구단 띠가 다 펼쳐지면 BackgroundWash가 띠 한가운데서부터 그 구단 색으로 칠하고,
  // 다 칠하면 paintedColor가 바뀌어 바탕(--bg) 자체가 그 색이 된다. 다른 구단을 고르면 이전 색 위로 새로 칠한다.
  // (관심 구단 테마의 바탕보다 앞선다. 글자·카드가 읽히도록 구단 색은 조금만 섞는다. 게시판을 떠나면 원래대로)
  const [paintedColor, setPaintedColor] = useState<string | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const introPending = teamColor !== null && teamColor !== paintedColor
  const finishWash = useCallback(() => setPaintedColor(teamColor), [teamColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--bg', paintedColor ? teamBackground(paintedColor) : '#ffffff')
  }, [paintedColor])
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--bg')
    },
    [],
  )

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
  // 구단 목록은 금방 오므로 "불러오는 중" 표시 없이 비워 둔다.
  if (teams === null) return null

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

  // 글쓰기 버튼·분류 탭·배지 같은 강조색도 보고 있는 구단 색으로. (흰 글자가 읽히게 보정된 색)
  const teamTheme = buildTeamTheme(teamColor)
  const accentStyle = teamTheme
    ? ({ '--accent': teamTheme.accent, '--accent-strong': teamTheme.accentStrong } as CSSProperties)
    : undefined

  return (
    <div className="community" style={accentStyle}>
      <TeamStrip
        teams={teams}
        favoriteTeam={favoriteTeam}
        selectedTeamId={selectedId}
        onSelect={selectTeam}
        favoriteSettingPath={settingPath}
      />

      {/* 구단이 바뀔 때마다 띠를 새로 그려 펼쳐지는 연출을 다시 보여 준다. */}
      {selectedTeam && <TeamBanner key={selectedTeam.id} ref={bannerRef} team={selectedTeam} />}
      {/* 글이 올라오기 전까지 화면 아래 응원 장면. 구단이 바뀔 때마다 한 번씩 나온다. */}
      {teamColor && <CheerCrowd key={teamColor} color={teamColor} />}
      {introPending && teamColor && (
        <BackgroundWash
          key={teamColor}
          color={teamBackground(teamColor)}
          originRef={bannerRef}
          onDone={finishWash}
        />
      )}

      {selectedId !== null && (
        <TeamBoard
          key={`${selectedId}:${category}`}
          teamId={selectedId}
          team={selectedTeam}
          category={category}
          onCategoryChange={changeCategory}
          canWrite={member !== null}
          introMs={introPending ? COMMUNITY_INTRO_MS : 0}
        />
      )}
    </div>
  )
}
