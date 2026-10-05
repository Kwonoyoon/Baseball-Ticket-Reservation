import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { SignupPage } from './SignupPage'

function renderSignupPage() {
  const router = createMemoryRouter(
    [
      { path: '/signup', element: <SignupPage /> },
      { path: '/', element: <p>경기 일정 화면</p> },
    ],
    { initialEntries: ['/signup'] },
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

async function submitSignup(username: string) {
  const user = userEvent.setup()
  // 입력 칸 아래 안내 문구도 label 안에 있어서 앞부분으로 찾는다.
  const [password, passwordConfirm] = screen.getAllByLabelText(/^비밀번호/)
  await user.type(screen.getByLabelText(/^아이디/), username)
  await user.type(screen.getByLabelText('이름'), '야구팬')
  await user.type(screen.getByLabelText('이메일'), 'fan@ballpark.com')
  await user.type(password, 'password123')
  await user.type(passwordConfirm, 'password123')
  await user.click(screen.getByRole('button', { name: '가입하기' }))
}

const member = { id: 1, username: 'fan01', email: 'fan@ballpark.com', name: '야구팬', role: 'MEMBER' }

describe('SignupPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('아이디로 가입한 뒤 같은 아이디로 로그인한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, member))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 7200, member }))
    vi.stubGlobal('fetch', fetchMock)
    renderSignupPage()

    await submitSignup('fan01')

    expect(await screen.findByText('경기 일정 화면')).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      username: 'fan01',
      name: '야구팬',
      email: 'fan@ballpark.com',
      password: 'password123',
    })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ username: 'fan01', password: 'password123', autoLogin: false })
  })

  it('형식에 맞지 않는 아이디는 서버로 보내지 않는다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderSignupPage()

    await submitSignup('1fan')

    expect(await screen.findByRole('alert')).toHaveTextContent('아이디는 영문으로 시작하는 영문·숫자 4~20자로 입력해 주세요.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('이미 사용 중인 아이디면 서버의 오류 메시지를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { code: 'DUPLICATE_USERNAME', message: '이미 사용 중인 아이디입니다.' })),
    )
    renderSignupPage()

    await submitSignup('fan01')

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 아이디입니다.')
  })
})
