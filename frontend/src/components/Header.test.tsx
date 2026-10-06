import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { NotificationProvider } from '../notifications/NotificationProvider'
import { restoreSessionAs, testMember } from '../test/session'
import { Header } from './Header'

function renderHeader(initialEntry = '/') {
  const router = createMemoryRouter([{ path: '*', element: <Header /> }], { initialEntries: [initialEntry] })
  // 실제 앱(App.tsx)과 같은 순서로 감싼다. 헤더의 알림 벨이 NotificationProvider를 쓴다.
  render(
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>,
  )
}

/** 로그인했던 브라우저에서 헤더를 그리고, 세션 복원(이름 표시)까지 기다린다. */
async function renderLoggedIn(role: 'MEMBER' | 'ADMIN' = 'MEMBER', initialEntry = '/') {
  const fetchMock = restoreSessionAs(testMember(role))
  renderHeader(initialEntry)
  await screen.findByRole('link', { name: '야구팬님' })
  return fetchMock
}

describe('Header', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('로그인 전에는 로그인·회원가입만 보이고 예매내역은 아예 없다', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup')
    expect(screen.queryByText('예매내역')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })

  it('로그인 후에는 이름(마이페이지 링크)과 예매내역이 보이고, 로그아웃은 사이드바 안에 있다', async () => {
    await renderLoggedIn()

    expect(screen.getByRole('link', { name: '야구팬님' })).toHaveAttribute('href', '/my/account')
    expect(screen.getByRole('link', { name: '예매내역' })).toHaveAttribute('href', '/my/reservations')
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  })

  it('로그아웃하면 예매내역이 사라지고 로그인/회원가입이 다시 나온다', async () => {
    const fetchMock = await renderLoggedIn()
    const user = userEvent.setup()

    // 로그아웃은 이제 사이드바 안에 있다.
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    // 닫는 애니메이션이 끝나야 사이드바 속 "예매내역" 항목도 화면에서 빠진다.
    await waitFor(() => expect(screen.queryByText('예매내역')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(localStorage.getItem('ballpark.session')).toBeNull()
  })

  // 회원 관리(관리자) 메뉴는 이제 헤더가 아니라 사이드바("관리자 페이지")에 있다. 아래 'Header 사이드바'에서 확인한다.

  it('세션을 복원하는 동안에는 로그인 버튼을 잠깐 보여 주지 않는다', async () => {
    localStorage.setItem('ballpark.session', '1')
    let respond: (response: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))))
    renderHeader()

    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()

    respond(new Response(null, { status: 401 }))
    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
  })

  it('세션 복원에 실패하면 비회원 화면이 된다', async () => {
    localStorage.setItem('ballpark.session', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'INVALID_REFRESH_TOKEN' }), { status: 401 })),
    )
    renderHeader()

    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
    expect(localStorage.getItem('ballpark.session')).toBeNull()
  })

  it('경기 일정 링크는 로그인 여부와 상관없이 항상 보인다', () => {
    renderHeader('/my/reservations')

    expect(screen.getByRole('link', { name: '경기 일정' })).toHaveAttribute('href', '/')
  })

  it('로그인 전에는 알림과 메뉴 버튼이 아예 없다', () => {
    renderHeader()

    expect(screen.queryByRole('button', { name: '알림' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '메뉴 열기' })).not.toBeInTheDocument()
  })

  it('로그인 후에는 알림과 메뉴 버튼이 보인다', async () => {
    await renderLoggedIn()

    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Header 사이드바', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('메뉴 버튼을 누르면 사이드바가 열리고 닫기 버튼으로 닫힌다', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    expect(screen.queryByRole('complementary', { name: '사이드바' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    expect(screen.getByRole('complementary', { name: '사이드바' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: '닫기' }))
    // 닫는 애니메이션이 끝나야 화면에서 빠진다.
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: '사이드바' })).not.toBeInTheDocument(),
    )
  })

  it('사이드바에서도 예매내역으로 갈 수 있다 (좁은 화면에서는 헤더 링크를 접기 때문)', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const sidebar = screen.getByRole('complementary', { name: '사이드바' })

    expect(within(sidebar).getByRole('link', { name: '예매내역' })).toHaveAttribute('href', '/my/reservations')
    expect(within(sidebar).getByRole('link', { name: '마이페이지' })).toHaveAttribute('href', '/my/account')
    expect(within(sidebar).queryByRole('link', { name: /관리자 페이지/ })).not.toBeInTheDocument()
  })

  it('공지는 상단바가 아니라 사이드바에 있다', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    // 상단바(헤더)에는 공지 링크가 없다.
    expect(screen.queryByRole('link', { name: '공지' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const sidebar = screen.getByRole('complementary', { name: '사이드바' })

    expect(within(sidebar).getByRole('link', { name: '공지' })).toHaveAttribute('href', '/notices')
  })

  it('분실물센터는 사이드바에 있다', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const sidebar = screen.getByRole('complementary', { name: '사이드바' })

    expect(within(sidebar).getByRole('link', { name: '분실물센터' })).toHaveAttribute('href', '/lost-properties')
  })

  it('관리자는 사이드바에서 관리자 페이지로 갈 수 있다', async () => {
    await renderLoggedIn('ADMIN')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const sidebar = screen.getByRole('complementary', { name: '사이드바' })

    expect(within(sidebar).getByRole('link', { name: /관리자 페이지/ })).toHaveAttribute('href', '/admin')
  })

  it('직관 캘린더를 누르면 새 창으로 열고 사이드바를 닫는다', async () => {
    const openMock = vi.spyOn(window, 'open').mockReturnValue(null)
    await renderLoggedIn()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    await user.click(screen.getByRole('button', { name: /직관 캘린더/ }))

    expect(openMock).toHaveBeenCalledWith('/my/calendar', 'safeticket-calendar', expect.stringContaining('width='))
    // 닫는 애니메이션이 끝나야 화면에서 빠진다.
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: '사이드바' })).not.toBeInTheDocument(),
    )
  })

  it('Esc를 누르면 닫히고 포커스가 메뉴 버튼으로 돌아온다', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    await user.keyboard('{Escape}')

    // 닫는 애니메이션이 끝나야 화면에서 빠진다.
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: '사이드바' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveFocus()
  })

  it('사이드바가 열린 채 로그아웃하면 사이드바도 사라진다', async () => {
    await renderLoggedIn()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    // 닫는 애니메이션이 끝나야 화면에서 빠진다.
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: '사이드바' })).not.toBeInTheDocument(),
    )
  })
})
