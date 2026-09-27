import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { HomeHeader } from './HomeHeader'

function renderHeader() {
  const router = createMemoryRouter([{ path: '/', element: <HomeHeader /> }])
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function storeLogin() {
  localStorage.setItem(
    'ballpark.auth',
    JSON.stringify({
      accessToken: 'access-token',
      expiresAt: Date.now() + 60_000,
      member: { id: 1, email: 'fan@ballpark.com', name: '야구팬' },
    }),
  )
}

describe('HomeHeader', () => {
  it('로그인 전에는 로그인만 보이고 예매내역은 아예 없다', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
    expect(screen.queryByText('예매내역')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })

  it('로그인 후에는 예매내역과 로그아웃이 보인다', () => {
    storeLogin()
    renderHeader()

    expect(screen.getByRole('link', { name: '예매내역' })).toHaveAttribute('href', '/my/reservations')
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  })

  it('로그아웃하면 예매내역이 사라지고 로그인이 다시 나온다', async () => {
    storeLogin()
    renderHeader()

    await userEvent.setup().click(screen.getByRole('button', { name: '로그아웃' }))

    expect(screen.queryByText('예매내역')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
    expect(localStorage.getItem('ballpark.auth')).toBeNull()
  })
})
