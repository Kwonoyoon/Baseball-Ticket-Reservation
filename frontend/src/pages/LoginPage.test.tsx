import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { LoginPage } from './LoginPage'

function renderLoginPage(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/games/:gameId', element: <p>좌석 선택 화면</p> },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function submitLogin(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('아이디'), username)
  await user.type(screen.getByLabelText('비밀번호'), password)
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('로그인에 성공하면 원래 가려던 페이지로 이동한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 7200,
        member: { id: 1, username: 'fan01', email: 'fan@ballpark.com', name: '야구팬' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage('/login?redirect=/games/7')

    await submitLogin('fan01', 'password123')

    expect(await screen.findByText('좌석 선택 화면')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'fan01', password: 'password123' }) }),
    )
    expect(localStorage.getItem('ballpark.auth')).toContain('access-token')
  })

  it('로그인에 실패하면 서버의 오류 메시지를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: '아이디 또는 비밀번호가 올바르지 않습니다.' }),
      ),
    )
    renderLoginPage('/login')

    await submitLogin('fan01', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다.')
  })
})
