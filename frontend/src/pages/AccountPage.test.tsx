import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireAuth } from '../auth/RequireAuth'
import { jsonResponse, loginResult, restoreSessionAs, testMember } from '../test/session'
import { AccountPage } from './AccountPage'
import { PasswordChangePage } from './PasswordChangePage'
import { WithdrawPage } from './WithdrawPage'

function renderAt(path: string) {
  const guarded = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>
  const router = createMemoryRouter(
    [
      { path: '/my/account', element: guarded(<AccountPage />) },
      { path: '/my/account/password', element: guarded(<PasswordChangePage />) },
      { path: '/my/account/withdraw', element: guarded(<WithdrawPage />) },
      { path: '/my/reservations', element: <p>예매 확인 화면</p> },
      { path: '/', element: <p>경기 일정 화면</p> },
      { path: '/login', element: <p>로그인 화면</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

const reservation = (status: 'CONFIRMED' | 'CANCELED', startAt: string) => ({ id: 1, status, game: { startAt } })

describe('AccountPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('비회원은 로그인 화면으로 보낸다', async () => {
    renderAt('/my/account')
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  })

  it('내 정보와 권한, 메뉴를 보여 주고 비밀번호·탈퇴 양식은 이 화면에 바로 두지 않는다', async () => {
    restoreSessionAs(testMember('MEMBER'))
    renderAt('/my/account')

    expect(await screen.findByText('fan01')).toBeInTheDocument()
    expect(screen.getByText('회원')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예매 확인 \/ 취소/ })).toHaveAttribute('href', '/my/reservations')
    expect(screen.getByRole('link', { name: /비밀번호 변경/ })).toHaveAttribute('href', '/my/account/password')
    expect(screen.getByRole('link', { name: /회원 탈퇴/ })).toHaveAttribute('href', '/my/account/withdraw')
    expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('비밀번호 확인')).not.toBeInTheDocument()
  })

  it('관리자에게는 회원 탈퇴 메뉴를 보여 주지 않는다', async () => {
    restoreSessionAs(testMember('ADMIN'))
    renderAt('/my/account')

    expect(await screen.findByText('관리자')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /회원 탈퇴/ })).not.toBeInTheDocument()
  })

  it('관람 예정인 확정 예매 수를 예매 확인 / 취소 메뉴에 보여 준다', async () => {
    restoreSessionAs(testMember(), (url) =>
      url === '/api/reservations/me'
        ? jsonResponse(200, [
            reservation('CONFIRMED', '2099-01-01T18:30:00'),
            reservation('CONFIRMED', '2099-01-02T18:30:00'),
            reservation('CANCELED', '2099-01-03T18:30:00'),
            reservation('CONFIRMED', '2020-01-01T18:30:00'),
          ])
        : undefined,
    )
    renderAt('/my/account')

    expect(await screen.findByText('관람 예정 2건')).toBeInTheDocument()
  })

  it('예매 확인 / 취소 메뉴를 누르면 예매 화면으로 간다', async () => {
    restoreSessionAs(testMember())
    renderAt('/my/account')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: /예매 확인 \/ 취소/ }))

    expect(await screen.findByText('예매 확인 화면')).toBeInTheDocument()
  })

  it('비밀번호 변경 메뉴를 누르면 비밀번호 변경 화면이 열린다', async () => {
    restoreSessionAs(testMember())
    renderAt('/my/account')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: /비밀번호 변경/ }))

    expect(await screen.findByRole('heading', { name: '비밀번호 변경', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument()
  })
})

describe('PasswordChangePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('비밀번호를 바꾸면 새 토큰으로 세션을 이어 간다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) =>
      url === '/api/auth/password' && init?.method === 'PUT'
        ? jsonResponse(200, loginResult(testMember(), 'after-change'))
        : undefined,
    )
    renderAt('/my/account/password')
    await screen.findByLabelText('현재 비밀번호')
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
    renderAt('/my/account/password')
    await screen.findByLabelText('현재 비밀번호')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'password123')
    await user.type(screen.getByLabelText(/^새 비밀번호\d/), 'new-password-456')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'different-456')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(screen.getByRole('alert')).toHaveTextContent('새 비밀번호가 일치하지 않습니다.')
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/auth/password')).toBe(false)
  })
})

describe('WithdrawPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('탈퇴하면 로그아웃하고 첫 화면으로 간다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    restoreSessionAs(testMember(), (url) =>
      url === '/api/members/me/withdraw' ? new Response(null, { status: 204 }) : undefined,
    )
    renderAt('/my/account/withdraw')
    await screen.findByLabelText('비밀번호 확인')
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
    renderAt('/my/account/withdraw')
    await screen.findByLabelText('비밀번호 확인')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123')
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('관람 예정인 예매가 있어 탈퇴할 수 없습니다.')
  })

  it('관리자는 탈퇴 화면 대신 마이페이지로 돌려보낸다', async () => {
    restoreSessionAs(testMember('ADMIN'))
    renderAt('/my/account/withdraw')

    expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument()
    expect(screen.queryByLabelText('비밀번호 확인')).not.toBeInTheDocument()
  })
})
