import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory, Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { CommunityNotices } from '../components/CommunityNotices'
import { PopularPosts } from '../components/PopularPosts'
import { ErrorMessage } from '../components/StatusView'
import { TeamBoard } from '../components/TeamBoard'
import { TeamPicker } from '../components/TeamPicker'
import { DEFAULT_POST_CATEGORY, parsePostCategory } from '../lib/postCategory'
import { buildTeamTheme } from '../lib/teamTheme'
import './CommunityBoardPage.css'

/** 게시판 바탕에 섞는 구단 색 비율(%). 관심 구단 테마(7%)보다 조금 진하게. */
const TEAM_BG_MIX_PERCENT = 4

/** 구단 색을 섞은 게시판 바탕색 */
const teamBackground = (color: string) => `color-mix(in srgb, ${color} ${TEAM_BG_MIX_PERCENT}%, #f6f7fa)`

/** 주소의 쪽 번호(?page=). 숫자가 아니거나 1보다 작으면 1쪽으로 본다. */
function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/** 관심 구단을 정하는 곳. 비회원은 로그인한 뒤 그리로 간다. */
const FAVORITE_SETTING_PATH = '/my/account'

/**
 * 커뮤니티. 위에는 마이팀(마이팀이 없을 때만 10개 구단 전체), 아래는 왼쪽 게시판 목록 + 오른쪽 글.
 * /community 로 들어오면 마이팀(없으면 첫 구단), /community/:teamId 로 들어오면 그 구단을 보여 준다.
 * 고른 구단과 분류는 주소에 남겨, 글을 보다가 목록으로 돌아와도 그대로다.
 */
export function CommunityBoardPage() {
  const { teamId } = useParams<{ teamId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { member, loading: authLoading } = useAuth()

  const [teams, setTeams] = useState<Team[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const favoriteTeam = teams?.find((team) => team.id === member?.favoriteTeamId) ?? null
  const selectedId = teamId !== undefined ? Number(teamId) : (favoriteTeam?.id ?? teams?.[0]?.id ?? null)
  const selectedTeam = teams?.find((team) => team.id === selectedId) ?? null
  // 마이팀이 없으면 구단을 눌러 봐도 색을 입히지 않는다. (바탕은 흰색, 강조색은 기본)
  const teamColor = favoriteTeam ? (selectedTeam?.primaryColor ?? null) : null

  // 페이지 바탕: 보고 있는 구단 색을 조금 섞는다. (관심 구단 테마의 바탕보다 앞선다. 글자·카드가 읽히도록
  // 조금만 섞고, 게시판을 떠나면 원래대로)
  useEffect(() => {
    document.documentElement.style.setProperty('--bg', teamColor ? teamBackground(teamColor) : '#ffffff')
  }, [teamColor])
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
  // 구단 목록은 금방 오므로 "불러오는 중" 표시 없이 비워 둔다. 로그인 복원이 끝나기 전에는 마이팀을 알 수 없어서
  // 같이 기다린다. (먼저 그리면 10개 구단이 잠깐 보였다가 마이팀 하나로 바뀐다)
  if (teams === null || authLoading) return null

  const category = parsePostCategory(searchParams.get('category'))
  const keyword = (searchParams.get('q') ?? '').trim()
  const page = parsePage(searchParams.get('page'))

  // 주소에 남길 값을 한곳에서 만든다. 기본값(자유, 검색어 없음, 1쪽)은 주소에서 뺀다.
  const boardParams = (next: { category: PostCategory; keyword: string; page: number }) => {
    const params: Record<string, string> = {}
    if (next.category !== DEFAULT_POST_CATEGORY) params.category = next.category
    if (next.keyword) params.q = next.keyword
    if (next.page > 1) params.page = String(next.page)
    return params
  }

  const selectTeam = (id: number) => {
    // 구단을 바꿔도 보던 분류는 유지한다. 줄에서 이리저리 눌러 본 것은 방문 기록에 쌓지 않는다.
    const query = category === DEFAULT_POST_CATEGORY ? '' : `?category=${category}`
    navigate(`/community/${id}${query}`, { replace: true })
  }

  // 분류나 검색어가 바뀌면 1쪽부터 다시 본다. 쪽만 넘길 때는 방문 기록에 쌓아 뒤로 가기로 돌아올 수 있게 한다.
  const changeCategory = (next: PostCategory) => {
    setSearchParams(boardParams({ category: next, keyword, page: 1 }), { replace: true })
  }
  const changeKeyword = (next: string) => {
    setSearchParams(boardParams({ category, keyword: next, page: 1 }), { replace: true })
  }
  const changePage = (next: number) => {
    setSearchParams(boardParams({ category, keyword, page: next }))
  }

  const settingPath = member ? FAVORITE_SETTING_PATH : `/login?redirect=${encodeURIComponent(FAVORITE_SETTING_PATH)}`

  // 글쓰기 버튼·분류 탭·배지 같은 강조색도 보고 있는 구단 색으로. (흰 글자가 읽히게 보정된 색)
  const teamTheme = buildTeamTheme(teamColor)
  const accentStyle = teamTheme
    ? ({ '--accent': teamTheme.accent, '--accent-strong': teamTheme.accentStrong } as CSSProperties)
    : undefined

  return (
    <div className="community" style={accentStyle}>
      <TeamPicker
        teams={teams}
        favoriteTeam={favoriteTeam}
        selectedTeamId={selectedId}
        onSelect={selectTeam}
        favoriteSettingPath={settingPath}
      />

      {/* 위에서부터: 구단 → 커뮤니티 공지 → 인기글 → 게시판 */}
      <CommunityNotices />
      {selectedId !== null && <PopularPosts key={selectedId} teamId={selectedId} />}

      {selectedId !== null && (
        <TeamBoard
          key={`${selectedId}:${category}:${keyword}:${page}`}
          teamId={selectedId}
          team={selectedTeam}
          category={category}
          onCategoryChange={changeCategory}
          keyword={keyword}
          onSearch={changeKeyword}
          page={page}
          onPageChange={changePage}
          canWrite={member !== null}
        />
      )}
    </div>
  )
}
