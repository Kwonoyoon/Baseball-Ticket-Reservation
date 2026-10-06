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

/** 서버 목록 한 쪽. page는 서버 기준(0부터), totalPages는 전체 쪽 수 */
const postPage = (totalPages = 1, page = 0) => ({
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
  hasMore: page + 1 < totalPages,
  page,
  size: 20,
  totalCount: totalPages * 20,
  totalPages,
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

  it('쪽 번호를 보여 주고, 번호나 다음·마지막을 누르면 그 쪽 글을 불러온다', async () => {
    const requested: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) {
          requested.push(url)
          const serverPage = Number(new URL(url, 'http://test').searchParams.get('page'))
          return jsonResponse(200, postPage(7, serverPage))
        }
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    // 7쪽 가운데 1~5쪽 번호가 보이고, 1쪽이 지금 쪽이다.
    const pager = await screen.findByRole('navigation', { name: '페이지 이동' })
    expect(within(pager).getAllByRole('button', { name: /^\d+쪽$/ }).map((b) => b.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(within(pager).getByRole('button', { name: '1쪽' })).toHaveAttribute('aria-current', 'page')
    expect(within(pager).getByRole('button', { name: '처음 쪽' })).toBeDisabled()
    expect(within(pager).getByRole('button', { name: '이전 쪽' })).toBeDisabled()
    // 더 보기 버튼으로 글을 이어 붙이던 방식은 없어졌다.
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()

    await userEvent.click(within(pager).getByRole('button', { name: '3쪽' }))

    // 화면은 1부터, 서버는 0부터. 3쪽이면 서버에는 page=2.
    await waitFor(() => expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/1?page=3'))
    await waitFor(() => expect(requested.at(-1)).toContain('page=2'))

    // 마지막 쪽(7쪽)으로 가면 6~7쪽 묶음이 보이고 다음·마지막은 막힌다.
    await userEvent.click(
      within(await screen.findByRole('navigation', { name: '페이지 이동' })).getByRole('button', { name: '마지막 쪽' }),
    )
    await waitFor(() => expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/1?page=7'))
    const last = await screen.findByRole('navigation', { name: '페이지 이동' })
    await waitFor(() =>
      expect(within(last).getAllByRole('button', { name: /^\d+쪽$/ }).map((b) => b.textContent)).toEqual(['6', '7']),
    )
    expect(within(last).getByRole('button', { name: '7쪽' })).toHaveAttribute('aria-current', 'page')
    expect(within(last).getByRole('button', { name: '다음 쪽' })).toBeDisabled()
    expect(within(last).getByRole('button', { name: '마지막 쪽' })).toBeDisabled()
  })

  it('글이 한 쪽에 다 들어가면 1쪽만 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/api/teams') return jsonResponse(200, teams)
        if (url.startsWith('/api/teams/1/posts')) return jsonResponse(200, postPage(1))
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderBoard()

    const pager = await screen.findByRole('navigation', { name: '페이지 이동' })
    expect(within(pager).getAllByRole('button', { name: /^\d+쪽$/ })).toHaveLength(1)
    expect(within(pager).getByRole('button', { name: '다음 쪽' })).toBeDisabled()
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
    // 이미 마이팀 게시판을 보고 있으니 돌아가는 버튼도 없다.
    expect(screen.queryByRole('button', { name: '마이팀 게시판으로' })).not.toBeInTheDocument()
  })

  it('마이팀이 있어도 주소로 다른 구단 게시판에 들어오면 마이팀으로 돌아가는 버튼이 나온다', async () => {
    restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) => {
      if (url === '/api/teams') return jsonResponse(200, teams)
      if (url.startsWith('/api/teams/')) return jsonResponse(200, { items: [], hasMore: false })
      return undefined
    })
    renderBoard('/community/3')

    await screen.findByText('KIA 타이거즈 게시판', { selector: 'h1' })
    await userEvent.click(await screen.findByRole('button', { name: '마이팀 게시판으로' }))

    expect(await screen.findByText('두산 베어스 게시판', { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/community/2')
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
    expect(within(side).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['자유', '경기', '응원', '티켓 양도'])
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

    // 마이팀 게시판으로 돌아가면 마이팀 색으로 바뀐다.
    await userEvent.click(screen.getByRole('button', { name: '마이팀 게시판으로' }))
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
})
