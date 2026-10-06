import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { NotificationProvider } from '../notifications/NotificationProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { SchedulePage } from './SchedulePage'

const teams = [
  { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' },
  { id: 2, code: 'OB', name: '두산 베어스', shortName: '두산', primaryColor: '#131230' },
  { id: 3, code: 'HT', name: 'KIA 타이거즈', shortName: 'KIA', primaryColor: '#EA0029' },
]

function CurrentLocation() {
  const location = useLocation()
  return <output aria-label="현재 주소">{location.pathname + location.search}</output>
}

function renderSchedule(initialEntry = '/') {
  const page = (
    <>
      <SchedulePage />
      <CurrentLocation />
    </>
  )
  const router = createMemoryRouter([{ path: '/', element: page }], { initialEntries: [initialEntry] })
  render(
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>,
  )
}

/** 일정 요청(/api/games?...)에 실린 teamId만 모아 본다. 히어로도 teamId 없이 일정을 부르므로 "있는 것"만 센다. */
function requestedTeamIds(fetchMock: ReturnType<typeof vi.fn>): (string | null)[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.startsWith('/api/games?'))
    .map((url) => new URL(url, 'http://localhost').searchParams.get('teamId'))
}

const handler = (url: string): Response | undefined => {
  if (url === '/api/teams') return jsonResponse(200, teams)
  if (url.startsWith('/api/games?')) return jsonResponse(200, [])
  return undefined
}

describe('SchedulePage 마이팀 기본 선택', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('마이팀이 있으면 그 구단 경기를 기본으로 불러오고, 구단 필터 맨 앞에 MY 표시와 함께 둔다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), handler)
    renderSchedule()

    await waitFor(() => expect(requestedTeamIds(fetchMock)).toContain('2'))

    const rail = await screen.findByRole('group', { name: '구단 필터' })
    const buttons = within(rail).getAllByRole('button')
    // 맨 앞은 전체, 그 다음이 마이팀이다. (원래 순서로는 두산이 두 번째 구단)
    expect(buttons[1]).toHaveTextContent('두산 베어스')
    expect(buttons[1]).toHaveTextContent('MY')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('"전체"를 누르면 모든 구단을 보고, 주소에 team=all이 남아 마이팀으로 되돌아가지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), handler)
    renderSchedule()
    const rail = await screen.findByRole('group', { name: '구단 필터' })
    await waitFor(() => expect(requestedTeamIds(fetchMock)).toContain('2'))
    fetchMock.mockClear()

    await userEvent.click(within(rail).getAllByRole('button')[0])

    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('team=all')
    expect(within(rail).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(requestedTeamIds(fetchMock).length).toBeGreaterThan(0))
    expect(requestedTeamIds(fetchMock)).not.toContain('2')
  })

  it('마이팀이 없으면 전체 구단을 보여준다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: null }), handler)
    renderSchedule()

    const rail = await screen.findByRole('group', { name: '구단 필터' })
    await waitFor(() => expect(requestedTeamIds(fetchMock).length).toBeGreaterThan(0))

    expect(requestedTeamIds(fetchMock).every((id) => id === null)).toBe(true)
    expect(within(rail).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')
    expect(within(rail).queryByText('MY')).not.toBeInTheDocument()
  })

  it('주소에 구단이 직접 적혀 있으면 마이팀보다 그 구단이 우선이다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), handler)
    renderSchedule('/?team=3')

    await waitFor(() => expect(requestedTeamIds(fetchMock)).toContain('3'))
    expect(requestedTeamIds(fetchMock)).not.toContain('2')
  })

  it('비회원은 전체 구단을 보여준다', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(String(input)) ?? jsonResponse(404, {}))
    vi.stubGlobal('fetch', fetchMock)
    renderSchedule()

    const rail = await screen.findByRole('group', { name: '구단 필터' })
    await waitFor(() => expect(requestedTeamIds(fetchMock).length).toBeGreaterThan(0))

    expect(requestedTeamIds(fetchMock).every((id) => id === null)).toBe(true)
    expect(within(rail).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')
  })
})
