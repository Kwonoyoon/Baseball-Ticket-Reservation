import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireAuth } from '../auth/RequireAuth'
import { jsonResponse, loginResult, restoreSessionAs, testMember } from '../test/session'
import { AccountPage } from './AccountPage'

function renderAccountPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/my/account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      { path: '/', element: <p>경기 일정 화면</p> },
      { path: '/login', element: <p>로그인 화면</p> },
    ],
    { initialEntries: ['/my/account'] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('AccountPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('비회원은 로그인 화면으로 보낸다', async () => {
    renderAccountPage()
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  })

  it('내 정보와 권한을 보여 준다', async () => {
    restoreSessionAs(testMember('MEMBER'))
    renderAccountPage()

    expect(await screen.findByText('fan01')).toBeInTheDocument()
    expect(screen.getByText('회원')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '회원 탈퇴' })).toBeInTheDocument()
  })

  it('관리자에게는 탈퇴 양식을 보여 주지 않는다', async () => {
    restoreSessionAs(testMember('ADMIN'))
    renderAccountPage()

    expect(await screen.findByText('관리자')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '회원 탈퇴' })).not.toBeInTheDocument()
  })

  it('비밀번호를 바꾸면 새 토큰으로 세션을 이어 간다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) =>
      url === '/api/auth/password' && init?.method === 'PUT'
        ? jsonResponse(200, loginResult(testMember(), 'after-change'))
        : undefined,
    )
    renderAccountPage()
    await screen.findByText('fan01')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'password123')
    await user.type(screen.getByLabelText(/^새 비밀번호\d/), 'new-password-456')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-456')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText(/다른 기기에서는 모두 로그아웃되었습니다/)).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls.find((call) => call[0] === '/api/auth/password')![1]!.body as string)).toEqual({
      currentPassword: 'password123',
      newPassword: 'new-password-456',
    })
  })

  it('새 비밀번호 확인이 다르면 보내지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember())
    renderAccountPage()
    await screen.findByText('fan01')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'password123')
    await user.type(screen.getByLabelText(/^새 비밀번호\d/), 'new-password-456')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'different-456')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(screen.getByRole('alert')).toHaveTextContent('새 비밀번호가 일치하지 않습니다.')
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/auth/password')).toBe(false)
  })

  it('탈퇴하면 로그아웃하고 첫 화면으로 간다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    restoreSessionAs(testMember(), (url) =>
      url === '/api/members/me/withdraw' ? new Response(null, { status: 204 }) : undefined,
    )
    renderAccountPage()
    await screen.findByText('fan01')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(await screen.findByText('경기 일정 화면')).toBeInTheDocument()
    expect(localStorage.getItem('ballpark.session')).toBeNull()
  })

  it('관람 예정인 예매가 있어 탈퇴할 수 없으면 서버 안내를 보여 준다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    restoreSessionAs(testMember(), (url) =>
      url === '/api/members/me/withdraw'
        ? jsonResponse(409, { code: 'HAS_UPCOMING_RESERVATIONS', message: '관람 예정인 예매가 있어 탈퇴할 수 없습니다.' })
        : undefined,
    )
    renderAccountPage()
    await screen.findByText('fan01')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('관람 예정인 예매가 있어 탈퇴할 수 없습니다.')
  })
})
