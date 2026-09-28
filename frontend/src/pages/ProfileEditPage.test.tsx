import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireAuth } from '../auth/RequireAuth'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { AccountPage } from './AccountPage'
import { ProfileEditPage } from './ProfileEditPage'

function renderAt(path: string) {
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
      {
        path: '/my/account/profile',
        element: (
          <RequireAuth>
            <ProfileEditPage />
          </RequireAuth>
        ),
      },
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

describe('ProfileEditPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('마이페이지 메뉴에서 프로필 수정 화면으로 들어간다', async () => {
    restoreSessionAs(testMember())
    renderAt('/my/account')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: /프로필 수정/ }))

    expect(await screen.findByRole('heading', { name: '프로필 수정', level: 1 })).toBeInTheDocument()
  })

  it('현재 이름·이메일이 채워져 있고 아이디는 수정할 수 없다', async () => {
    restoreSessionAs(testMember())
    renderAt('/my/account/profile')

    expect(await screen.findByLabelText('이름')).toHaveValue('야구팬')
    expect(screen.getByLabelText('이메일')).toHaveValue('fan@ballpark.com')
    expect(screen.getByText('fan01')).toBeInTheDocument()
    expect(screen.queryByLabelText('아이디')).not.toBeInTheDocument()
  })

  it('저장하면 서버에 보내고 성공 안내를 보여 준다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) =>
      url === '/api/members/me/profile' && init?.method === 'PUT'
        ? jsonResponse(200, testMember('MEMBER', { name: '새이름', email: 'new@ballpark.com' }))
        : undefined,
    )
    renderAt('/my/account/profile')
    const user = userEvent.setup()

    const name = await screen.findByLabelText('이름')
    await user.clear(name)
    await user.type(name, '새이름')
    const email = screen.getByLabelText('이메일')
    await user.clear(email)
    await user.type(email, 'new@ballpark.com')
    await user.type(screen.getByLabelText(/^현재 비밀번호/), 'password123')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('프로필을 수정했습니다.')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/members/me/profile')!
    expect(JSON.parse(call[1]!.body as string)).toEqual({
      name: '새이름',
      email: 'new@ballpark.com',
      currentPassword: 'password123',
    })
  })

  it('현재 비밀번호를 비우면 보내지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember())
    renderAt('/my/account/profile')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '저장' }))

    expect(screen.getByRole('alert')).toHaveTextContent('현재 비밀번호를 입력해 주세요.')
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/members/me/profile')).toBe(false)
  })

  it('이메일 형식이 틀리면 보내지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember())
    renderAt('/my/account/profile')
    const user = userEvent.setup()

    const email = await screen.findByLabelText('이메일')
    await user.clear(email)
    await user.type(email, 'not-an-email')
    await user.type(screen.getByLabelText(/^현재 비밀번호/), 'password123')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByRole('alert')).toHaveTextContent('이메일 형식이 올바르지 않습니다.')
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/members/me/profile')).toBe(false)
  })

  it('서버가 거절하면 안내 문구를 보여 준다', async () => {
    restoreSessionAs(testMember(), (url) =>
      url === '/api/members/me/profile'
        ? jsonResponse(409, { code: 'DUPLICATE_EMAIL', message: '이미 가입된 이메일입니다.' })
        : undefined,
    )
    renderAt('/my/account/profile')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/^현재 비밀번호/), 'password123')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입된 이메일입니다.')
  })
})
