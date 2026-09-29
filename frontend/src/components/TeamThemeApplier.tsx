import { useEffect } from 'react'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { buildTeamTheme, type TeamTheme } from '../lib/teamTheme'

const STORAGE_KEY = 'ballpark.teamTheme'

/** <html>에 테마를 적용한다. null이면 index.css의 기본 강조색으로 돌아간다. */
export function applyTeamTheme(theme: TeamTheme | null): void {
  const root = document.documentElement
  if (theme) {
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--accent-strong', theme.accentStrong)
    root.style.setProperty('--accent-on-dark', theme.accentOnDark)
    root.setAttribute('data-team-theme', '')
  } else {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-strong')
    root.style.removeProperty('--accent-on-dark')
    root.removeAttribute('data-team-theme')
  }
}

function readSavedTheme(): TeamTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TeamTheme>
    // 예전 형식(accentOnDark가 없는 값)은 쓰지 않는다. 로그인 복원 뒤에 새로 계산해 덮어쓴다.
    return typeof parsed.accent === 'string' &&
      typeof parsed.accentStrong === 'string' &&
      typeof parsed.accentOnDark === 'string'
      ? { accent: parsed.accent, accentStrong: parsed.accentStrong, accentOnDark: parsed.accentOnDark }
      : null
  } catch {
    return null
  }
}

function saveTheme(theme: TeamTheme | null): void {
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없으면 새로고침 직후 잠깐 기본 색이 보일 뿐이다.
  }
}

/** 앱을 그리기 전에 마지막 테마를 먼저 적용해서, 새로고침할 때 기본 색이 번쩍이지 않게 한다. */
export function applySavedTeamTheme(): void {
  applyTeamTheme(readSavedTheme())
}

/**
 * 로그인한 회원의 관심 구단 색으로 사이트 강조색을 바꾼다. 화면에는 아무것도 그리지 않는다.
 * 로그인 상태를 복원하는 동안(loading)에는 저장해 둔 테마를 유지하고, 복원이 끝나 관심 구단이 없다고
 * 확정되면(비회원·로그아웃·해제) 기본 색으로 돌린다.
 */
export function TeamThemeApplier() {
  const { member, loading } = useAuth()
  const favoriteTeamId = member?.favoriteTeamId ?? null

  useEffect(() => {
    if (loading) return undefined

    if (favoriteTeamId === null) {
      applyTeamTheme(null)
      saveTheme(null)
      return undefined
    }

    const controller = new AbortController()
    api
      .getTeams(controller.signal)
      .then((teams) => {
        const theme = buildTeamTheme(teams.find((team) => team.id === favoriteTeamId)?.primaryColor)
        applyTeamTheme(theme)
        saveTheme(theme)
      })
      .catch(() => {
        // 구단 목록을 못 불러오면 지금 적용된 색을 그대로 둔다.
      })
    return () => controller.abort()
  }, [favoriteTeamId, loading])

  return null
}
