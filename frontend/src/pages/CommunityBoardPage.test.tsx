import { render, screen, waitFor, within } from '@testing-library/react'
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

/** 테스트가 따로 준비하지 않은 공지·인기글 요청은 "없음"으로 답한다. 해당 화면을 보는 테스트가 직접 덮어쓴다. */
let extraRoutes: Record<string, unknown> = {}

function renderBoard(initialEntry = '/community/1') {
  const inner = globalThis.fetch
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith('/api/notices')) return Promise.resolve(jsonResponse(200, extraRoutes.notices ?? []))
    if (url.includes('/posts/popular')) return Promise.resolve(jsonResponse(200, extraRoutes.popular ?? []))
    return inner(input, init)
  })
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
    extraRoutes = {}
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

  it('비회원에게도 글쓰기 버튼이 보인다(누르면 로그인 화면을 거친다)', async () => {
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
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/community/1/write')
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

  it('다음 쪽이 있으면 이전/다음 버튼이 보이고, 다음을 누르면 2쪽 글을 불러온다', async () => {
    const requested: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) {
          requested.push(url)
          return jsonResponse(200, postPage(!url.includes('page=1')))
        }
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    const pager = await screen.findByRole('navigation', { name: '페이지 이동' })
    expect(within(pager).getByRole('button', { name: '이전' })).toBeDisabled()
    expect(within(pager).getByRole('button', { name: '다음' })).toBeEnabled()
    // 더 보기 버튼으로 글을 이어 붙이던 방식은 없어졌다.
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()

    await userEvent.click(within(pager).getByRole('button', { name: '다음' }))

    // 화면은 1부터, 서버는 0부터. 2쪽이면 서버에는 page=1.
    await waitFor(() => expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/1?page=2'))
    await waitFor(() => expect(requested.at(-1)).toContain('page=1'))
    const second = await screen.findByRole('navigation', { name: '페이지 이동' })
    expect(within(second).getByRole('button', { name: '이전' })).toBeEnabled()
    // 마지막 쪽: 다음 쪽이 없다.
    expect(within(second).getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('글이 한 쪽에 다 들어가면 이전/다음을 보여 주지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage(false))
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    await screen.findByText('첫 글입니다')
    expect(screen.queryByRole('navigation', { name: '페이지 이동' })).not.toBeInTheDocument()
  })

  it('검색어를 넣으면 서버에 q로 보내고, 주소에 남기며 1쪽부터 다시 본다', async () => {
    const requested: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) {
          requested.push(url)
          return jsonResponse(200, postPage())
        }
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard('/community/1?page=3')

    await screen.findByText('첫 글입니다')
    await userEvent.type(screen.getByRole('searchbox', { name: '게시글 검색' }), '  100% 할인 ')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/1?q=100%25+%ED'))
    // 앞뒤 공백은 떼고, %는 주소에서 %25로 인코딩해 보낸다. 쪽은 1쪽으로 돌아온다(page 파라미터가 사라진다).
    await waitFor(() => expect(requested.at(-1)).toContain('q=100%25%20%ED%95%A0%EC%9D%B8'))
    expect(requested.at(-1)).toContain('page=0')
    expect(await screen.findByText('검색 결과')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '검색 지우기' }))
    await waitFor(() => expect(screen.getByLabelText('현재 주소')).toHaveTextContent(/^\/community\/1$/))
  })

  it('마이팀이 없으면 구단을 눌러 봐도 바탕은 흰색이다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard('/community/2')

    await screen.findByRole('navigation', { name: '구단 선택' })
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe('#ffffff')
  })

  it('마이팀이 있으면 위에 마이팀 하나만 보이고, /community 로 들어오면 그 구단 게시판을 보여 준다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/2/posts')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    renderBoard('/community')

    const mine = await screen.findByRole('region', { name: '마이팀' })
    expect(within(mine).getByText('두산 베어스')).toBeInTheDocument()
    // 배너에 "마이팀" 글자는 쓰지 않는다. (화면 낭독기용 이름만 있다)
    expect(within(mine).queryByText('마이팀')).not.toBeInTheDocument()
    expect(await screen.findByText('두산 베어스 게시판')).toBeInTheDocument()
    // 다른 구단은 고르는 버튼으로 나오지 않는다.
    expect(screen.queryByRole('navigation', { name: '구단 선택' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'KIA 타이거즈 게시판' })).not.toBeInTheDocument()
    // 구단 목록은 배너를 누르기 전에는 접혀 있다.
    expect(screen.queryByRole('list', { name: '구단 목록' })).not.toBeInTheDocument()
  })

  it('마이팀 배너를 누르면 아래에 구단 목록이 펼쳐지고, 다른 구단을 고르면 그 게시판으로 간다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    renderBoard('/community')

    // 처음에는 마이팀 배너만 보이고 구단 목록은 접혀 있다.
    const banner = await screen.findByRole('button', { name: /눌러서 다른 구단 보기/ })
    expect(banner).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: '구단 목록' })).not.toBeInTheDocument()

    await userEvent.click(banner)

    const strip = screen.getByRole('list', { name: '구단 목록' })
    expect(banner).toHaveAttribute('aria-expanded', 'true')
    expect(within(strip).getAllByRole('button')).toHaveLength(teams.length)
    // 끊김 없이 흐르게 같은 목록을 이어 붙였지만, 복사본은 보조기기와 키보드에서 숨겨 구단이 중복으로 읽히지 않는다.
    const clones = document.querySelectorAll('.team-picker__strip[aria-hidden="true"]')
    expect(clones.length).toBeGreaterThan(0)
    clones.forEach((clone) => {
      clone.querySelectorAll('button').forEach((button) => expect(button).toHaveAttribute('tabindex', '-1'))
    })
    // 지금 보는 구단이 눌린 상태이고, 마이팀에는 별이 붙는다. (글자 "마이팀"은 쓰지 않는다)
    expect(within(strip).getByRole('button', { pressed: true })).toHaveAccessibleName(/두산/)
    expect(within(strip).getByText(/★/)).toBeInTheDocument()

    await userEvent.click(within(strip).getByRole('button', { name: /KIA/ }))

    expect(await screen.findByText('KIA 타이거즈 게시판', { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/3')
    // 고르면 목록이 접히고, 배너가 고른 구단으로 바뀐다.
    expect(screen.queryByRole('list', { name: '구단 목록' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /KIA 타이거즈 게시판, 눌러서/ })).toBeInTheDocument()
  })

  it('구단 목록은 Esc로 접힌다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    renderBoard('/community')

    await userEvent.click(await screen.findByRole('button', { name: /눌러서 다른 구단 보기/ }))
    expect(screen.getByRole('list', { name: '구단 목록' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('list', { name: '구단 목록' })).not.toBeInTheDocument()
  })

  it('마이팀이 없을 때만 구단이 모두 보이고, 마이팀을 정하러 가는 링크가 있다', async () => {
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

    const picker = await screen.findByRole('navigation', { name: '구단 선택' })
    expect(within(picker).getAllByRole('button')).toHaveLength(teams.length)
    // 비회원은 로그인한 뒤 마이팀 설정으로 간다.
    expect(within(picker).getByRole('link', { name: '마이팀을 정하면' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fmy%2Faccount',
    )
    expect(screen.queryByRole('region', { name: '마이팀' })).not.toBeInTheDocument()
    // 마이팀이 없으면 첫 구단 게시판을 보여 준다.
    expect(await screen.findByText('LG 트윈스 게시판')).toBeInTheDocument()
  })

  it('게시판(분류) 목록은 글 옆 사이드에 세로 목록으로 있다', async () => {
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

    const side = screen.getByRole('tablist', { name: '게시글 분류' })
    expect(side).toHaveAttribute('aria-orientation', 'vertical')
    expect(
      within(side)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['자유', '경기', '응원', '티켓 양도'])
  })

  it('구단을 누르면 아래 게시판이 그 구단으로 바뀐다', async () => {
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
          items: [
            { ...postPage().items[0], id: 11, category: 'GAME', title: '오늘 경기 후기', preview: '9회말 끝내기!' },
          ],
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

  it('마이팀이 있으면 보고 있는 구단 색으로 페이지 바탕을 물들이고, 게시판을 떠나면 되돌린다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 1 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    // 다른 구단(KIA) 게시판을 주소로 열어 둔 상태
    const { unmount } = renderBoard('/community/3')
    const rootBg = () => document.documentElement.style.getPropertyValue('--bg')

    await screen.findByText('KIA 타이거즈 게시판', { selector: 'h1' })
    await waitFor(() => expect(rootBg()).toContain('#EA0029'))

    // 배너를 눌러 마이팀(LG)을 고르면 마이팀 색으로 바뀐다.
    await userEvent.click(screen.getByRole('button', { name: /눌러서 다른 구단 보기/ }))
    await userEvent.click(within(screen.getByRole('list', { name: '구단 목록' })).getByRole('button', { name: /LG/ }))
    await screen.findByText('LG 트윈스 게시판', { selector: 'h1' })
    await waitFor(() => expect(rootBg()).toContain('#C30452'))

    unmount()
    expect(rootBg()).toBe('')
  })

  it('입장 연출(구단 영어 이름 띠, 응원 장면)은 더 이상 그리지 않는다', async () => {
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
    await screen.findByText('LG 트윈스 게시판', { selector: 'h1' })

    expect(document.querySelector('.team-banner-wrap')).toBeNull()
    expect(document.querySelector('.cheer')).toBeNull()
    expect(screen.queryByText('LG TWINS')).not.toBeInTheDocument()
  })

  it('커뮤니티 공지와 인기글이 구단 아래, 게시판 위에 순서대로 뜬다', async () => {
    extraRoutes = {
      notices: [
        {
          id: 1,
          scope: 'COMMUNITY',
          category: 'MAINTENANCE',
          title: '새벽 점검 안내',
          content: '2시부터 점검합니다.',
          createdAt: '2026-10-05T10:00:00',
          updatedAt: '2026-10-05T10:00:00',
        },
      ],
      popular: [{ ...postPage().items[0], id: 77, title: '좋아요 많은 글', likeCount: 9 }],
    }
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

    const notices = await screen.findByRole('region', { name: '커뮤니티 공지' })
    const popular = await screen.findByRole('region', { name: '인기글' })
    expect(within(notices).getByText('새벽 점검 안내')).toBeInTheDocument()
    expect(within(notices).getByText('점검')).toBeInTheDocument()
    expect(within(popular).getByRole('link', { name: /좋아요 많은 글/ })).toHaveAttribute(
      'href',
      '/community/1/posts/77',
    )
    expect(within(popular).getByText('좋아요 9')).toBeInTheDocument()
    // 공지 → 인기글 → 게시판(검색·글쓰기) 순서
    const board = screen.getByRole('search')
    expect(notices.compareDocumentPosition(popular) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(popular.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('공지나 인기글이 없으면 그 자리를 그리지 않는다', async () => {
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
    expect(screen.queryByRole('region', { name: '커뮤니티 공지' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '인기글' })).not.toBeInTheDocument()
  })

  it('글쓰기 버튼은 게시판 맨 위 검색창의 오른쪽에 있다', async () => {
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

    const write = await screen.findByRole('link', { name: '글쓰기' })
    const side = document.querySelector('.team-board__side')
    expect(side).not.toContainElement(write)
    const search = screen.getByRole('search')
    expect(write.closest('.board-toolbar')).toContainElement(search)
    // 검색창의 오른쪽에 있다.
    expect(search.compareDocumentPosition(write) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
