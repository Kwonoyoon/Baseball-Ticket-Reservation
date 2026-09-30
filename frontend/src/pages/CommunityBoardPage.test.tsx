import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { CommunityBoardPage } from './CommunityBoardPage'

const teams = [
  { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' },
  { id: 2, code: 'OB', name: '두산 베어스', shortName: '두산', primaryColor: '#131230' },
  { id: 3, code: 'HT', name: 'KIA 타이거즈', shortName: 'KIA', primaryColor: '#EA0029' },
]

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

/** 지금 주소를 화면에 적어 두어, 구단·분류를 고른 뒤 주소가 바뀌었는지 본다. */
function CurrentLocation() {
  const location = useLocation()
  return <output aria-label="현재 주소">{location.pathname + location.search}</output>
}

function renderBoard(initialEntry = '/community/1') {
  const page = (
    <>
      <CommunityBoardPage />
      <CurrentLocation />
    </>
  )
  const router = createMemoryRouter(
    [
      { path: '/community', element: page },
      { path: '/community/:teamId', element: page },
    ],
    { initialEntries: [initialEntry] },
  )
  return render(
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

  it('관심 구단이 가운데에 고정되고, /community 로 들어오면 그 구단 게시판을 보여 준다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/2/posts')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    renderBoard('/community')

    const center = await screen.findByRole('button', { name: '두산 베어스 게시판 (관심 구단)' })
    expect(center).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('두산 베어스 게시판')).toBeInTheDocument()
    // 흐르는 줄에는 관심 구단을 뺀 나머지 구단만 있다.
    expect(screen.queryByRole('button', { name: '두산 베어스 게시판' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'KIA 타이거즈 게시판' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전 구단' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음 구단' })).toBeInTheDocument()
  })

  it('관심 구단이 없으면 가운데 빈 원이 관심 구단 설정 버튼이 된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard('/community')

    // 비회원은 로그인한 뒤 관심 구단 설정으로 간다.
    expect(await screen.findByRole('link', { name: /관심 구단 설정/ })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fmy%2Faccount',
    )
    // 관심 구단이 없으면 첫 구단 게시판을 보여 준다.
    expect(await screen.findByText('LG 트윈스 게시판')).toBeInTheDocument()
  })

  it('줄에서 다른 구단을 누르면 아래 게시판이 그 구단으로 바뀐다', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
      if (url.startsWith('/api/teams/3/posts')) return jsonResponse(200, { items: [], hasMore: false })
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderBoard()
    await screen.findByText('첫 글입니다')

    await userEvent.click(screen.getByRole('button', { name: 'KIA 타이거즈 게시판' }))

    expect(await screen.findByText('KIA 타이거즈 게시판', { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'KIA 타이거즈 게시판' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/3')
    // 글이 없으면 빈 카드를 둔다.
    expect(await screen.findByText('아직 자유 글이 없어요.')).toBeInTheDocument()
  })

  it('분류 탭을 누르면 그 분류 글만 불러오고 주소에 남긴다', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/1/posts') && url.includes('category=GAME')) {
        return jsonResponse(200, {
          items: [{ ...postPage().items[0], id: 11, category: 'GAME', title: '오늘 경기 후기', preview: '9회말 끝내기!' }],
          hasMore: false,
        })
      }
      if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage())
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderBoard()
    await screen.findByText('첫 글입니다')
    expect(screen.getByRole('tab', { name: '자유' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: '경기' }))

    expect(await screen.findByText('오늘 경기 후기')).toBeInTheDocument()
    expect(screen.getByText('9회말 끝내기!')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '경기' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/1?category=GAME')
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes('category=GAME'))).toBe(true),
    )
  })

  it('주소에 분류가 있으면 그 탭으로 열린다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, { items: [], hasMore: false })
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard('/community/1?category=CHEER')

    expect(await screen.findByText('아직 응원 글이 없어요.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '응원' })).toHaveAttribute('aria-selected', 'true')
  })

  it('보고 있는 구단 색으로 페이지 바탕을 물들이고, 게시판을 떠나면 되돌린다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    const { unmount } = renderBoard()
    const rootBg = () => document.documentElement.style.getPropertyValue('--bg')

    await screen.findByText('LG 트윈스 게시판', { selector: 'h1' })
    // 처음엔 흰 바탕. 띠가 다 나온 뒤 구단 색으로 칠해진다. (연출 전체 약 2.7초)
    expect(rootBg()).toBe('#ffffff')
    await waitFor(() => expect(rootBg()).toContain('#C30452'), { timeout: 5000 })

    // 다른 구단을 고르면 이전 구단 색 위로 새 색을 칠한다.
    await userEvent.click(screen.getByRole('button', { name: 'KIA 타이거즈 게시판' }))
    await screen.findByText('KIA 타이거즈 게시판', { selector: 'h1' })
    expect(rootBg()).toContain('#C30452')
    await waitFor(() => expect(rootBg()).toContain('#EA0029'), { timeout: 5000 })

    unmount()
    expect(rootBg()).toBe('')
  }, 15000)

  it('구단 줄 아래 띠에 보고 있는 구단 영어 이름이 그 구단 색 바탕으로 흐른다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    const names = await screen.findAllByText('LG TWINS')
    expect(names.length).toBeGreaterThan(1)
    expect(document.querySelector<HTMLElement>('.team-banner-wrap')!.style.getPropertyValue('--team-color')).toBe('#C30452')

    await userEvent.click(screen.getByRole('button', { name: 'KIA 타이거즈 게시판' }))
    // 테스트 자료의 KIA 코드(HT)는 영어 이름 목록에 없어 코드를 그대로 쓴다.
    expect((await screen.findAllByText('HT')).length).toBeGreaterThan(1)
    expect(screen.queryByText('LG TWINS')).not.toBeInTheDocument()
  })
})
