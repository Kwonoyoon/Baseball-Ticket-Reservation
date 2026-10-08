import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, loginResult, restoreSessionAs, testMember } from '../test/session'
import { CommunityPostPage } from './CommunityPostPage'

const post = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 10,
  teamId: 1,
  authorId: 2,
  authorName: '다른팬',
  title: '제목입니다',
  content: '본문입니다',
  category: 'FREE',
  viewCount: 5,
  likeCount: 1,
  commentCount: 1,
  liked: false,
  mine: false,
  createdAt: '2026-09-29T10:00:00',
  updatedAt: '2026-09-29T10:00:00',
  ...overrides,
})

const comments = [
  { id: 100, authorId: 2, authorName: '다른팬', content: '댓글입니다', mine: false, createdAt: '2026-09-29T11:00:00' },
]

function renderPost() {
  const router = createMemoryRouter([{ path: '/community/:teamId/posts/:postId', element: <CommunityPostPage /> }], {
    initialEntries: ['/community/1/posts/10'],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('CommunityPostPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('글 내용과 댓글을 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/posts/10') return jsonResponse(200, post())
        if (url === '/api/posts/10/comments') return jsonResponse(200, comments)
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderPost()

    expect(await screen.findByText('제목입니다')).toBeInTheDocument()
    expect(screen.getByText('본문입니다')).toBeInTheDocument()
    expect(screen.getByText('자유')).toBeInTheDocument()
    expect(await screen.findByText('댓글입니다')).toBeInTheDocument()
  })

  it('실제 오류일 때는 제대로 오류 화면을 보여 준다', async () => {
    // 회귀 확인용: AbortError만 무시해야 하고, 진짜 서버 오류(예: 500)는 그대로 보여야 한다.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/posts/10') {
          return jsonResponse(500, { code: 'INTERNAL_ERROR', message: '일시적인 오류가 발생했습니다.' })
        }
        if (url === '/api/posts/10/comments') return jsonResponse(200, [])
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderPost()

    expect(await screen.findByText('일시적인 오류가 발생했습니다.')).toBeInTheDocument()
  })

  it('본인 글이면 수정·삭제가, 남의 글이면 신고 버튼이 보인다', async () => {
    restoreSessionAs(testMember(), (url) => {
      if (url === '/api/posts/10') return jsonResponse(200, post({ mine: false }))
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      return undefined
    })
    renderPost()

    expect(await screen.findByRole('button', { name: '신고' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
  })

  it('좋아요를 누르면 서버에 저장하고 표시가 바뀐다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      if (url === '/api/posts/10/like' && init?.method === 'POST') {
        return jsonResponse(200, { liked: true, likeCount: 2 })
      }
      return undefined
    })
    renderPost()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /좋아요 1/ }))

    expect(await screen.findByRole('button', { name: '좋아요 2' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/posts/10/like')).toBe(true)
  })

  it('비회원이 좋아요를 누르면 서버에 보내지 않고 로그인 안내를 띄운다', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPost()
    const user = userEvent.setup()

    const like = await screen.findByRole('button', { name: /좋아요 1/ })
    // 비회원이어도 버튼은 눌러 볼 수 있다. (눌러지지 않아 헷갈리는 것보다 안내가 낫다)
    expect(like).toBeEnabled()
    await user.click(like)

    expect(await screen.findByText(/좋아요는 로그인한 뒤에 누를 수 있어요/)).toBeInTheDocument()
    // 로그인하면 이 글로 돌아오도록 주소를 넘긴다.
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fcommunity%2F1%2Fposts%2F10',
    )
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/like'))).toBe(false)
    expect(screen.getByRole('button', { name: /좋아요 1/ })).toBeInTheDocument()
  })

  it('신고 버튼을 누르면 사유 입력창이 열리고, 제출하면 서버로 보낸다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      if (url === '/api/posts/10/report' && init?.method === 'POST') return new Response(null, { status: 204 })
      return undefined
    })
    renderPost()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '신고' }))
    const textarea = await screen.findByLabelText('신고 사유')
    await user.type(textarea, '부적절한 내용입니다')
    await user.click(screen.getByRole('button', { name: '신고 접수' }))

    expect(await screen.findByText('신고가 접수되었습니다.')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/posts/10/report')!
    expect(JSON.parse(call[1]!.body as string)).toEqual({ reason: '부적절한 내용입니다' })
  })

  it('로그인 세션 복원이 끝나기 전에는 글을 불러오지 않는다', async () => {
    // 회귀 확인용: 복원 전에 먼저 불러오면 서버가 비회원 요청으로 보고 mine·liked를 전부 false로 내려준다.
    let resolveRefresh!: (value: Response) => void
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    localStorage.setItem('ballpark.session', '1')
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/auth/refresh') return refreshPromise
      if (url === '/api/posts/10') {
        expect((init?.headers as Headers).get('Authorization')).toBe('Bearer access-token')
        return jsonResponse(200, post({ mine: true }))
      }
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPost()

    // 복원이 끝나기 전까지는 글 요청 자체가 나가지 않는다.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/posts/10')).toBe(false)

    resolveRefresh(jsonResponse(200, loginResult(testMember())))

    expect(await screen.findByRole('link', { name: '수정' })).toBeInTheDocument()
  })

  it('일반 회원에게는 남의 글에 관리자 삭제 버튼이 보이지 않는다', async () => {
    restoreSessionAs(testMember(), (url) => {
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, comments)
      return undefined
    })
    renderPost()

    await screen.findByText('제목입니다')
    // 글과 댓글에 신고 버튼이 하나씩 보이는 로그인 상태에서도 관리자 삭제 버튼은 없다.
    expect(await screen.findAllByRole('button', { name: '신고' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '관리자 삭제' })).not.toBeInTheDocument()
  })

  it('관리자는 남의 댓글을 관리자 삭제로 바로 지운다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = restoreSessionAs(testMember('ADMIN', { id: 9 }), (url, init) => {
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, comments)
      if (url === '/api/admin/community/comments/100' && init?.method === 'DELETE') return new Response(null, { status: 204 })
      return undefined
    })
    renderPost()
    const user = userEvent.setup()

    // 글 1개 + 댓글 1개에 버튼이 하나씩 있다.
    const buttons = await screen.findAllByRole('button', { name: '관리자 삭제' })
    expect(buttons).toHaveLength(2)

    await user.click(buttons[1])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/community/comments/100',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument()
  })

  it('신고 사유를 안 쓰면 서버로 보내지 않는다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url) => {
      if (url === '/api/posts/10') return jsonResponse(200, post())
      if (url === '/api/posts/10/comments') return jsonResponse(200, [])
      return undefined
    })
    renderPost()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '신고' }))
    await user.click(screen.getByRole('button', { name: '신고 접수' }))

    expect(screen.getByRole('alert')).toHaveTextContent('신고 사유를 입력해 주세요.')
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/posts/10/report')).toBe(false)
  })
})
