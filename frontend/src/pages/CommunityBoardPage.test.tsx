import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { CommunityBoardPage } from './CommunityBoardPage'

const teams = [{ id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' }]

const postPage = (hasMore = false) => ({
  items: [
    {
      id: 10,
      authorName: '야구팬',
      title: '첫 글입니다',
      viewCount: 3,
      likeCount: 1,
      commentCount: 2,
      createdAt: '2026-09-29T10:00:00',
    },
  ],
  hasMore,
})

function renderBoard() {
  const router = createMemoryRouter(
    [{ path: '/community/:teamId', element: <CommunityBoardPage /> }],
    { initialEntries: ['/community/1'] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('CommunityBoardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('구단 이름과 글 목록을 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    expect(await screen.findByText('LG 트윈스 게시판')).toBeInTheDocument()
    expect(await screen.findByText('첫 글입니다')).toBeInTheDocument()
    expect(screen.getByText(/조회 3/)).toBeInTheDocument()
  })

  it('비회원에게는 글쓰기 버튼이 보이지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    await screen.findByText('첫 글입니다')
    expect(screen.queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument()
  })

  it('로그인한 회원에게는 글쓰기 버튼이 보인다', async () => {
    restoreSessionAs(testMember(), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
      return undefined
    })
    renderBoard()

    expect(await screen.findByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/community/1/write')
  })

  it('더 볼 글이 있으면 더 보기 버튼이 보인다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage(true))
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    expect(await screen.findByRole('button', { name: '더 보기' })).toBeInTheDocument()
  })
})
