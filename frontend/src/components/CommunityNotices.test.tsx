import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { CommunityNotices } from './CommunityNotices'

const notice = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 5,
  scope: 'COMMUNITY',
  category: 'EVENT',
  title: '이번 주 이벤트 안내',
  content: '직관 인증 이벤트를 합니다.',
  createdAt: '2026-10-06T10:00:00',
  updatedAt: '2026-10-06T10:00:00',
  ...overrides,
})

function renderNotices() {
  render(
    <AuthProvider>
      <CommunityNotices />
    </AuthProvider>,
  )
}

describe('CommunityNotices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('비회원에게는 공지가 없으면 영역을 숨기고, 관리 버튼도 없다', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/api/notices')) return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderNotices()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: '커뮤니티 공지' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '공지 올리기' })).not.toBeInTheDocument()
  })

  it('일반 회원에게는 공지만 보이고 올리기·수정·내리기 버튼은 없다', async () => {
    restoreSessionAs(testMember(), (url) => {
      if (url.startsWith('/api/notices')) return jsonResponse(200, [notice()])
      return undefined
    })
    renderNotices()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /이번 주 이벤트 안내/ }))

    expect(screen.queryByRole('button', { name: '공지 올리기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '내리기' })).not.toBeInTheDocument()
  })

  it('관리자는 공지가 하나도 없어도 첫 공지를 올릴 수 있고, 커뮤니티 공지로 저장된다', async () => {
    let created: Record<string, unknown> | null = null
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 9 }), (url, init) => {
      if (url === '/api/admin/notices' && init?.method === 'POST') {
        created = JSON.parse(String(init.body))
        return jsonResponse(201, notice({ id: 6, title: '첫 공지' }))
      }
      if (url.startsWith('/api/notices')) return jsonResponse(200, created ? [notice({ id: 6, title: '첫 공지' })] : [])
      return undefined
    })
    renderNotices()
    const user = userEvent.setup()

    expect(await screen.findByText(/올라온 공지가 없어요/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '공지 올리기' }))

    // 자리가 커뮤니티로 고정되어 "뜨는 자리" 선택칸이 없다.
    expect(screen.queryByLabelText('뜨는 자리')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('제목'), '첫 공지')
    await user.type(screen.getByLabelText('내용'), '안녕하세요')
    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(await screen.findByText('공지를 올렸어요.')).toBeInTheDocument()
    expect(created).toMatchObject({ scope: 'COMMUNITY', category: 'UPDATE', title: '첫 공지', content: '안녕하세요' })
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/notices', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByRole('button', { name: /첫 공지/ })).toBeInTheDocument()
  })

  it('관리자가 공지를 내리면 서버에서 지우고 목록에서 사라진다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    let removed = false
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 9 }), (url, init) => {
      if (url === '/api/admin/notices/5' && init?.method === 'DELETE') {
        removed = true
        return new Response(null, { status: 204 })
      }
      if (url.startsWith('/api/notices')) return jsonResponse(200, removed ? [] : [notice()])
      return undefined
    })
    renderNotices()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /이번 주 이벤트 안내/ }))
    await user.click(screen.getByRole('button', { name: '내리기' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/notices/5', expect.objectContaining({ method: 'DELETE' }))
    expect(await screen.findByText('공지를 내렸어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /이번 주 이벤트 안내/ })).not.toBeInTheDocument()
  })

  it('관리자가 내리기를 취소하면 아무것도 지우지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 9 }), (url) => {
      if (url.startsWith('/api/notices')) return jsonResponse(200, [notice()])
      return undefined
    })
    renderNotices()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /이번 주 이벤트 안내/ }))
    await user.click(screen.getByRole('button', { name: '내리기' }))

    expect(fetchMock.mock.calls.some((c) => String(c[0]).startsWith('/api/admin/notices'))).toBe(false)
  })
})
