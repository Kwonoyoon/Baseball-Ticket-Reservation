import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { FavoriteTeamPanel } from './FavoriteTeamPanel'

const teams = [
  { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' },
  { id: 2, code: 'DOOSAN', name: '두산 베어스', shortName: '두산', primaryColor: '#131230' },
]

function renderPanel() {
  render(
    <AuthProvider>
      <FavoriteTeamPanel />
    </AuthProvider>,
  )
}

describe('FavoriteTeamPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('현재 관심 구단이 선택된 상태로 보인다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) =>
      url === '/api/teams' ? jsonResponse(200, teams) : undefined,
    )
    renderPanel()

    expect(await screen.findByRole('button', { name: '두산 베어스' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'LG 트윈스' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('구단을 누르면 서버에 저장하고 선택 표시가 바뀐다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url === '/api/members/me/favorite-team' && init?.method === 'PATCH') {
        return jsonResponse(200, testMember('MEMBER', { favoriteTeamId: 1 }))
      }
      return undefined
    })
    renderPanel()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'LG 트윈스' }))

    expect(await screen.findByRole('button', { name: 'LG 트윈스', pressed: true })).toBeInTheDocument()
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/members/me/favorite-team')!
    expect(JSON.parse(call[1]!.body as string)).toEqual({ teamId: 1 })
  })

  it('선택된 구단을 다시 누르면 해제를 요청한다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 1 }), (url, init) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url === '/api/members/me/favorite-team' && init?.method === 'PATCH') {
        return jsonResponse(200, testMember('MEMBER', { favoriteTeamId: null }))
      }
      return undefined
    })
    renderPanel()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'LG 트윈스', pressed: true }))

    expect(await screen.findByRole('button', { name: 'LG 트윈스', pressed: false })).toBeInTheDocument()
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/members/me/favorite-team')!
    expect(JSON.parse(call[1]!.body as string)).toEqual({ teamId: null })
  })
})
