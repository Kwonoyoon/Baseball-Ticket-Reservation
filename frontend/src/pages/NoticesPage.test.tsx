import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Notice } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { NoticesPage } from './NoticesPage'

const notice = (overrides: Partial<Notice>): Notice => ({
  id: 1,
  scope: 'GLOBAL',
  category: 'UPDATE',
  title: '좌석 배치도 개선',
  content: '좌석 배치도가 더 보기 쉬워졌어요.',
  createdAt: '2026-10-05T10:00:00',
  updatedAt: '2026-10-05T10:00:00',
  ...overrides,
})

function renderPage() {
  const router = createMemoryRouter([{ path: '/notices', element: <NoticesPage /> }], {
    initialEntries: ['/notices'],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('NoticesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('비회원은 전체 공지를 읽고, 제목을 누르면 내용이 펼쳐지며, 쓰기 버튼은 없다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/auth/refresh')
          return jsonResponse(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' })
        if (url.startsWith('/api/notices?scope=GLOBAL')) return jsonResponse(200, [notice({})])
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderPage()

    const title = await screen.findByRole('button', { name: /좌석 배치도 개선/ })
    expect(screen.getByText('시스템 업데이트')).toBeInTheDocument()
    expect(screen.queryByText('좌석 배치도가 더 보기 쉬워졌어요.')).not.toBeInTheDocument()

    await userEvent.click(title)

    expect(screen.getByText('좌석 배치도가 더 보기 쉬워졌어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '공지 쓰기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
  })

  it('관리자는 공지를 올릴 수 있고, 커뮤니티 공지 목록도 함께 본다', async () => {
    const created: unknown[] = []
    restoreSessionAs(testMember('ADMIN'), (url, init) => {
      if (url === '/api/admin/notices' && init?.method === 'POST') {
        created.push(JSON.parse(String(init.body)))
        return jsonResponse(201, notice({ id: 9, title: '점검 안내', category: 'MAINTENANCE' }))
      }
      if (url.startsWith('/api/notices?scope=GLOBAL')) return jsonResponse(200, [notice({})])
      if (url.startsWith('/api/notices?scope=COMMUNITY')) {
        return jsonResponse(200, [notice({ id: 2, scope: 'COMMUNITY', title: '이벤트 안내', category: 'EVENT' })])
      }
      return undefined
    })
    renderPage()

    // 로그인 복원이 끝나 관리자로 확인된 뒤에 커뮤니티 공지를 받아 오므로, 글이 나타날 때까지 기다린다.
    const eventTitle = await screen.findByText('이벤트 안내')
    expect(within(screen.getByRole('region', { name: /커뮤니티 공지/ })).getByText('이벤트 안내')).toBe(eventTitle)

    await userEvent.click(screen.getByRole('button', { name: '공지 쓰기' }))
    await userEvent.selectOptions(screen.getByLabelText('뜨는 자리'), 'COMMUNITY')
    await userEvent.selectOptions(screen.getByLabelText('종류'), 'MAINTENANCE')
    await userEvent.type(screen.getByLabelText('제목'), '  점검 안내 ')
    await userEvent.type(screen.getByLabelText('내용'), '새벽 2시 점검')
    await userEvent.click(screen.getByRole('button', { name: '올리기' }))

    expect(await screen.findByText('공지를 올렸어요.')).toBeInTheDocument()
    // 앞뒤 공백은 떼서 보낸다.
    expect(created).toEqual([
      { scope: 'COMMUNITY', category: 'MAINTENANCE', title: '점검 안내', content: '새벽 2시 점검' },
    ])
  })
})
