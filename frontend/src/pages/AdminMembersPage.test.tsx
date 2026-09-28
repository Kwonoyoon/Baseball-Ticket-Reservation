import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminMember } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireAdmin } from '../auth/RequireAuth'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { AdminMembersPage } from './AdminMembersPage'

function adminMember(overrides: Partial<AdminMember>): AdminMember {
  return {
    id: 2,
    username: 'fan02',
    name: '야구팬',
    email: 'fan02@ballpark.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lastLoginAt: '2026-09-27T10:00:00',
    createdAt: '2026-09-01T09:00:00',
    ...overrides,
  }
}

const members: AdminMember[] = [
  adminMember({ id: 1, username: 'admin', name: '관리자', role: 'ADMIN' }),
  adminMember({ id: 2, username: 'fan02' }),
  adminMember({ id: 3, username: 'locked03', status: 'LOCKED', failedLoginAttempts: 5 }),
]

function renderAdminPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/members',
        element: (
          <RequireAdmin>
            <AdminMembersPage />
          </RequireAdmin>
        ),
      },
      { path: '/login', element: <p>로그인 화면</p> },
    ],
    { initialEntries: ['/admin/members'] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('AdminMembersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('비회원은 로그인 화면으로 보낸다', async () => {
    renderAdminPage()
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  })

  it('회원에게는 관리자 전용 안내만 보여 준다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER'))
    renderAdminPage()

    expect(await screen.findByText('관리자만 볼 수 있는 화면입니다.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some((call) => String(call[0]).startsWith('/api/admin'))).toBe(false)
  })

  it('회원 목록을 보여 주고 본인 계정은 바꿀 수 없다', async () => {
    restoreSessionAs(testMember('ADMIN', { id: 1, username: 'admin', name: '관리자' }), (url) =>
      url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined,
    )
    renderAdminPage()

    const selfRow = (await screen.findByText('나')).closest('tr')!
    expect(within(selfRow).getByRole('button', { name: 'admin 권한' })).toBeDisabled()
    expect(within(selfRow).getByRole('button', { name: '잠금' })).toBeDisabled()

    const lockedRow = screen.getByText('locked03').closest('tr')!
    expect(within(lockedRow).getByText('잠김')).toBeInTheDocument()
    expect(within(lockedRow).getByText('실패 5회')).toBeInTheDocument()
    expect(within(lockedRow).getByRole('button', { name: '잠금 해제' })).toBeEnabled()
  })

  it('잠금을 확인하면 서버에 요청하고 목록을 바꾼다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 1 }), (url, init) => {
      if (url === '/api/admin/members/2/lock' && init?.method === 'POST') {
        return jsonResponse(200, adminMember({ id: 2, username: 'fan02', status: 'LOCKED' }))
      }
      return url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined
    })
    renderAdminPage()

    const row = (await screen.findByText('fan02')).closest('tr')!
    await userEvent.setup().click(within(row).getByRole('button', { name: '잠금' }))

    expect(await within(row).findByRole('button', { name: '잠금 해제' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('fan02 계정을 잠갔습니다.')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/members/2/lock', expect.objectContaining({ method: 'POST' }))
  })

  it('삭제를 확인하면 목록에서 사라진다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 1 }), (url, init) => {
      if (url === '/api/admin/members/2' && init?.method === 'DELETE') {
        return jsonResponse(
          200,
          adminMember({ id: 2, username: 'fan02', name: '탈퇴회원', status: 'WITHDRAWN' }),
        )
      }
      return url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined
    })
    renderAdminPage()

    const row = (await screen.findByText('fan02')).closest('tr')!
    await userEvent.setup().click(within(row).getByRole('button', { name: '삭제' }))

    // 삭제한 회원은 목록에서 사라진다.
    await waitFor(() => expect(screen.queryByText('fan02')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('fan02 회원을 삭제했습니다.')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/members/2', expect.objectContaining({ method: 'DELETE' }))
  })

  it('관리자 계정과 본인 계정은 삭제할 수 없다', async () => {
    restoreSessionAs(testMember('ADMIN', { id: 1 }), (url) =>
      url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined,
    )
    renderAdminPage()

    const adminRow = (await screen.findByText('admin')).closest('tr')!
    expect(within(adminRow).getByRole('button', { name: '삭제' })).toBeDisabled()
  })

  it('삭제를 취소하면 요청하지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 1 }), (url) =>
      url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined,
    )
    renderAdminPage()

    const row = (await screen.findByText('fan02')).closest('tr')!
    await userEvent.setup().click(within(row).getByRole('button', { name: '삭제' }))

    expect(fetchMock.mock.calls.some((call) => String(call[1] && call[1].method) === 'DELETE')).toBe(false)
  })

  it('권한 변경을 취소하면 요청하지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 1 }), (url) =>
      url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined,
    )
    renderAdminPage()

    const user = userEvent.setup()
    const row = (await screen.findByText('fan02')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'fan02 권한' }))
    await user.click(screen.getByRole('option', { name: '관리자' }))

    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/role'))).toBe(false)
  })

  it('검색어로 다시 불러온다', async () => {
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 1 }), (url) =>
      url.startsWith('/api/admin/members') ? jsonResponse(200, members) : undefined,
    )
    renderAdminPage()
    await screen.findByText('fan02')
    const user = userEvent.setup()

    await user.type(screen.getByRole('searchbox'), 'fan')
    await user.click(screen.getByRole('button', { name: '검색' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/members?keyword=fan', expect.anything())
  })
})
