import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { TeamThemeApplier, applySavedTeamTheme } from './TeamThemeApplier'

const teams = [
  { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' },
  { id: 6, code: 'HANWHA', name: '한화 이글스', shortName: '한화', primaryColor: '#FC4E00' },
]

const root = document.documentElement
const accent = () => root.style.getPropertyValue('--accent')

function renderApplier() {
  render(
    <AuthProvider>
      <TeamThemeApplier />
    </AuthProvider>,
  )
}

describe('TeamThemeApplier', () => {
  beforeEach(() => {
    localStorage.clear()
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-strong')
    root.removeAttribute('data-team-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('관심 구단이 있으면 그 구단 색이 강조색이 되고 테마 표시가 붙는다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 1 }), (url) =>
      url === '/api/teams' ? jsonResponse(200, teams) : undefined,
    )
    renderApplier()

    await waitFor(() => expect(accent()).toBe('#c30452'))
    expect(root.hasAttribute('data-team-theme')).toBe(true)
    expect(root.style.getPropertyValue('--accent-strong')).not.toBe('')
  })

  it('밝은 구단 색은 읽히도록 보정된 색이 적용된다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 6 }), (url) =>
      url === '/api/teams' ? jsonResponse(200, teams) : undefined,
    )
    renderApplier()

    await waitFor(() => expect(accent()).not.toBe(''))
    expect(accent()).not.toBe('#fc4e00')
  })

  it('관심 구단이 없으면 테마를 적용하지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: null }), (url) =>
      url === '/api/teams' ? jsonResponse(200, teams) : undefined,
    )
    renderApplier()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', expect.anything()))
    await waitFor(() => expect(localStorage.getItem('ballpark.teamTheme')).toBeNull())
    expect(accent()).toBe('')
    expect(root.hasAttribute('data-team-theme')).toBe(false)
  })

  it('구단 목록을 못 불러오면 기본 색을 그대로 둔다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 1 }), (url) =>
      url === '/api/teams' ? jsonResponse(500, { code: 'INTERNAL_ERROR', message: '오류' }) : undefined,
    )
    renderApplier()

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(accent()).toBe('')
  })

  it('새로고침하면 저장해 둔 마지막 테마를 먼저 입힌다', () => {
    localStorage.setItem('ballpark.teamTheme', JSON.stringify({ accent: '#123456', accentStrong: '#0a1f33' }))

    applySavedTeamTheme()

    expect(accent()).toBe('#123456')
    expect(root.hasAttribute('data-team-theme')).toBe(true)
  })

  it('저장된 값이 깨져 있어도 오류 없이 기본 색으로 둔다', () => {
    localStorage.setItem('ballpark.teamTheme', '{깨진 json')

    expect(() => applySavedTeamTheme()).not.toThrow()
    expect(accent()).toBe('')
  })
})
