import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary, HotGame, HotPost, RecentTransfer, Reservation, Standing, Team } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { addDays, todayInSeoul } from '../lib/format'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { TodayHero } from './TodayHero'

const team = (id: number, code: string, name: string, shortName: string): Team => ({
  id,
  code,
  name,
  shortName,
  primaryColor: '#123456',
})

const LG = team(1, 'LG', 'LG 트윈스', 'LG')
const DOOSAN = team(2, 'DOOSAN', '두산 베어스', '두산')
const KIA = team(3, 'KIA', 'KIA 타이거즈', 'KIA')
const NC = team(4, 'NC', 'NC 다이노스', 'NC')

function game(id: number, date: string, home: Team, away: Team, extra: Partial<GameSummary> = {}): GameSummary {
  return {
    id,
    startAt: `${date}T18:30:00`,
    homeTeam: home,
    awayTeam: away,
    stadium: { id, code: `S${id}`, name: `${home.shortName}구장`, city: '서울' },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    ...extra,
  }
}

/** 주소별로 준비해 둔 응답을 돌려주는 가짜 서버. 준비하지 않은 주소는 빈 목록으로 답한다. */
type Routes = {
  schedule?: Record<string, GameSummary[]>
  hotGames?: HotGame[] | 'error'
  standings?: Standing[]
  hotPosts?: HotPost[]
  transfers?: RecentTransfer[]
  reservations?: Reservation[]
}

const TOMORROW = addDays(todayInSeoul(), 1)

function handler(routes: Routes) {
  return (url: string): Response => {
    const path = url.split('?')[0]
    if (path === '/api/games') {
      const date = new URL(url, 'http://localhost').searchParams.get('date') ?? ''
      return jsonResponse(200, routes.schedule?.[date] ?? [])
    }
    if (path === '/api/games/hot') {
      return routes.hotGames === 'error'
        ? jsonResponse(500, { code: 'INTERNAL_ERROR', message: '오류' })
        : jsonResponse(200, routes.hotGames ?? [])
    }
    if (/^\/api\/games\/\d+\/seats\/summary$/.test(path)) {
      return jsonResponse(200, {
        sections: [{ sectionId: 1, totalSeats: 100, soldSeats: 60, heldSeats: 0, availableSeats: 40 }],
        myHeldSeats: [],
        myReservedSeats: 0,
        maxSeatsPerMember: 4,
      })
    }
    if (path === '/api/standings') return jsonResponse(200, routes.standings ?? [])
    if (path === '/api/community/hot-posts') return jsonResponse(200, routes.hotPosts ?? [])
    if (path === '/api/transfers/recent') return jsonResponse(200, routes.transfers ?? [])
    if (path === '/api/reservations/me') return jsonResponse(200, routes.reservations ?? [])
    return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
  }
}

function stubGuest(routes: Routes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(routes)(String(input)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderHero() {
  const router = createMemoryRouter([{ path: '/', element: <TodayHero /> }], { initialEntries: ['/'] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

const hotGame = (id: number, sold: number): HotGame => ({
  game: game(id, TOMORROW, LG, DOOSAN),
  soldSeats: sold,
  totalSeats: 1000,
})

const standing = (rank: number, t: Team, wins: number, losses: number): Standing => ({
  rank,
  team: t,
  wins,
  losses,
  draws: 0,
  winPct: wins + losses === 0 ? 0 : wins / (wins + losses),
  gamesBehind: rank === 1 ? 0 : rank,
})

const dots = () => screen.getAllByRole('button').filter((button) => !button.className.includes('home-hero__arrow'))

describe('TodayHero', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('슬라이드를 순서대로 만든다: 다음 경기 → 매진 임박 → 직관 챌린지 이벤트 → 오늘의 KBO → 커뮤니티·양도', async () => {
    const today = todayInSeoul()
    stubGuest({
      schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)], [today]: [game(5, today, KIA, NC)] },
      hotGames: [hotGame(7, 920)],
      hotPosts: [{ id: 3, team: LG, category: 'FREE', title: '좋아요 많은 글', likeCount: 9, commentCount: 2 }],
    })
    renderHero()

    await screen.findByRole('button', { name: '다음 경기' })
    // 비회원이라 "내 티켓"은 없다.
    expect(dots().map((dot) => dot.getAttribute('aria-label'))).toEqual([
      '다음 경기',
      '매진 임박',
      '직관 챌린지 이벤트',
      '오늘의 KBO',
      '커뮤니티와 양도',
    ])
    expect(screen.getByRole('heading', { level: 1, hidden: true })).toHaveTextContent('Today KBO')
  })

  it('다음 경기: D-day와 예매율·잔여석, 예매 링크를 보여 준다', async () => {
    stubGuest({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] } })
    renderHero()

    const slide = (await screen.findAllByRole('group', { hidden: true }))[0]
    expect(within(slide).getByText('D-1')).toBeInTheDocument()
    // 좌석 요약이 60/100 이면 예매율 60%, 잔여 40석
    expect(within(slide).getByText('예매율 60%')).toBeInTheDocument()
    expect(within(slide).getByText('잔여 40석')).toBeInTheDocument()
    expect(within(slide).getByRole('link', { name: '지금 예매하기' })).toHaveAttribute('href', '/games/1')
    // 마이팀이 없으니 "내 관심 구단"이 아니라 리그 전체의 다음 경기다.
    expect(within(slide).getByText('KBO 다음 경기')).toBeInTheDocument()
  })

  it('마이팀이 있으면 그 구단의 다음 경기를 찾아 "내 관심 구단"으로 보여 준다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER', { favoriteTeamId: 2 }), (url) =>
      handler({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] } })(url),
    )
    renderHero()

    expect(await screen.findByText('♥ 내 관심 구단')).toBeInTheDocument()
    // 마이팀(두산)이 원정이어도 일정 버튼은 두산 일정으로 간다. (홈팀 LG로 가던 버그)
    const slide = (await screen.findAllByRole('group', { hidden: true }))[0]
    expect(within(slide).getByRole('link', { name: '두산 경기 일정 전체' })).toHaveAttribute('href', '/?team=2')
    const scheduleCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.startsWith('/api/games?'))
    expect(scheduleCalls.some((url) => url.includes('teamId=2'))).toBe(true)
  })

  it('내 티켓: 로그인했고 앞으로 볼 예매가 있을 때만 나오며 이름과 보유 티켓을 보여 준다', async () => {
    const seat = (seatNo: number) => ({
      sectionId: 1,
      sectionCode: null,
      sectionName: '1루 블루석',
      grade: 'NAVY',
      rowNo: 12,
      seatNo,
      seatRows: 10,
      seatsPerRow: 20,
      price: 12000,
    })
    const reservation = {
      id: 15,
      reservationNumber: 'BP1',
      status: 'CONFIRMED',
      totalPrice: 24000,
      paymentMethod: 'CARD',
      createdAt: '2026-10-01T10:00:00',
      canceledAt: null,
      cancelable: true,
      game: game(9, TOMORROW, LG, DOOSAN),
      seats: [seat(13), seat(14)],
    } as unknown as Reservation
    restoreSessionAs(testMember('MEMBER', { name: '정승환' }), (url) =>
      handler({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] }, reservations: [reservation] })(url),
    )
    renderHero()

    const ticketDot = await screen.findByRole('button', { name: '내 티켓' })
    await userEvent.click(ticketDot)
    const slide = screen.getAllByRole('group', { hidden: true })[1]
    expect(within(slide).getByText(/정승환님,/)).toBeInTheDocument()
    // 좌석 2석을 보유 중이고, 첫 좌석 위치와 상세 링크가 나온다.
    expect(within(slide).getByText('보유 티켓').nextElementSibling).toHaveTextContent('2')
    expect(within(slide).getByText('12열 · 13번 외 1석')).toBeInTheDocument()
    expect(within(slide).getByRole('link', { name: /예매 상세 보기/ })).toHaveAttribute('href', '/reservations/15')
  })

  it('매진 임박: 예매율이 높은 경기를 잔여 비율과 함께 보여 준다', async () => {
    stubGuest({ hotGames: [hotGame(7, 920), hotGame(8, 700)] })
    renderHero()

    const slide = (await screen.findAllByRole('group', { hidden: true }))[0]
    // 예매율 92%는 70% 이상이라 "마감 임박" 칩이 붙는다.
    expect(within(slide).getAllByText('마감 임박').length).toBeGreaterThan(0)
    expect(within(slide).getByText('예매율 92%')).toBeInTheDocument()
    expect(within(slide).getAllByRole('link', { name: '예매하기' })[0]).toHaveAttribute('href', '/games/7')
  })

  it('오늘의 KBO: 결과가 있는 경기는 점수를, 아직인 경기는 vs를 보여 주고 순위를 함께 보여 준다', async () => {
    const today = todayInSeoul()
    stubGuest({
      schedule: {
        [today]: [
          game(5, today, KIA, NC, { status: 'FINISHED', homeScore: 3, awayScore: 5 }),
          game(6, today, LG, DOOSAN, { startAt: `${today}T23:50:00` }),
        ],
      },
      standings: [standing(1, LG, 6, 2), standing(2, KIA, 5, 3), standing(3, NC, 4, 4)],
    })
    renderHero()

    const games = await screen.findByRole('region', { name: '오늘의 KBO', hidden: true })
    expect(within(games).getByText('5 : 3')).toBeInTheDocument() // 원정 5 : 홈 3
    expect(within(games).getByText('종료')).toBeInTheDocument()
    expect(within(games).getByText('vs')).toBeInTheDocument()
    const ranks = screen.getByRole('region', { name: '구단 순위', hidden: true })
    expect(within(ranks).getByText('LG 트윈스')).toBeInTheDocument()
    expect(within(ranks).getByText('.750')).toBeInTheDocument()
  })

  it('순위를 집계할 경기 결과가 없으면 순위 대신 안내 문구를 보여 준다', async () => {
    const today = todayInSeoul()
    stubGuest({
      schedule: { [today]: [game(5, today, KIA, NC)] },
      standings: [standing(1, LG, 0, 0), standing(2, KIA, 0, 0)],
    })
    renderHero()

    expect(await screen.findByText('아직 순위를 집계할 경기 결과가 없어요.')).toBeInTheDocument()
  })

  it('지금 뜨는 커뮤니티와 방금 올라온 양도: 글과 양도글 링크를 보여 준다', async () => {
    stubGuest({
      hotPosts: [{ id: 3, team: LG, category: 'GAME', title: '오늘 경기 후기', likeCount: 12, commentCount: 4 }],
      transfers: [
        { id: 8, price: 36000, game: game(1, TOMORROW, LG, DOOSAN), seatCount: 2, sectionName: '1루 블루석' },
      ],
    })
    renderHero()

    // 이벤트 슬라이드가 앞에 있어서, 커뮤니티 슬라이드로 먼저 넘긴다.
    await userEvent.click(await screen.findByRole('button', { name: '커뮤니티와 양도' }))
    const posts = await screen.findByRole('region', { name: '지금 뜨는 커뮤니티', hidden: true })
    expect(within(posts).getByRole('link', { name: /오늘 경기 후기/ })).toHaveAttribute('href', '/community/1/posts/3')
    expect(within(posts).getByText('♥ 12')).toBeInTheDocument()
    const transfers = screen.getByRole('region', { name: '방금 올라온 티켓 양도', hidden: true })
    expect(within(transfers).getByText(/2연석/)).toBeInTheDocument()
    expect(within(transfers).getByText('36,000원')).toBeInTheDocument()
  })

  it('하나가 실패해도 나머지 슬라이드는 그대로 나온다', async () => {
    stubGuest({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] }, hotGames: 'error' })
    renderHero()

    // 매진 임박이 실패해도 다음 경기(와 같은 날 경기를 보여 주는 오늘의 KBO) 슬라이드는 그려진다.
    const slides = await waitFor(() => {
      const found = screen.getAllByRole('group', { hidden: true })
      expect(found).toHaveLength(3)
      return found
    })
    expect(within(slides[0]).getByText('D-1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매진 임박' })).not.toBeInTheDocument()
  })

  it('다른 데이터가 하나도 없어도 사이트 이벤트 슬라이드는 나오고, 슬라이드가 하나뿐이라 화살표는 없다', async () => {
    stubGuest({})
    renderHero()

    const slides = await screen.findAllByRole('group', { hidden: true })
    expect(slides).toHaveLength(1)
    expect(within(slides[0]).getByText(/직관 챌린지/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다음 슬라이드' })).not.toBeInTheDocument()
  })

  it('화면에 안 보이는 슬라이드는 보조기기와 키보드에서 숨긴다', async () => {
    stubGuest({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] }, hotGames: [hotGame(7, 920)] })
    renderHero()

    const slides = await waitFor(() => {
      const found = screen.getAllByRole('group', { hidden: true })
      expect(found).toHaveLength(4)
      return found
    })
    expect(slides.map((slide) => slide.getAttribute('aria-hidden'))).toEqual(['false', 'true', 'true', 'true'])
    expect(slides[1]).toHaveAttribute('inert')
    expect(slides[0]).not.toHaveAttribute('inert')
  })

  it('양옆 화살표로 다음·이전 슬라이드로 넘기고, 끝에서는 처음과 끝으로 돈다', async () => {
    stubGuest({ schedule: { [TOMORROW]: [game(1, TOMORROW, LG, DOOSAN)] }, hotGames: [hotGame(7, 920)] })
    renderHero()

    const first = await screen.findByRole('button', { name: '다음 경기' })
    const second = screen.getByRole('button', { name: '매진 임박' })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(second).toHaveAttribute('aria-current', 'true')

    const third = screen.getByRole('button', { name: '직관 챌린지 이벤트' })
    const fourth = screen.getByRole('button', { name: '오늘의 KBO' })
    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(third).toHaveAttribute('aria-current', 'true')
    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(fourth).toHaveAttribute('aria-current', 'true')

    // 마지막에서 다음을 누르면 처음으로 돌아온다.
    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(first).toHaveAttribute('aria-current', 'true')

    // 처음에서 이전을 누르면 마지막으로 간다.
    await user.click(screen.getByRole('button', { name: '이전 슬라이드' }))
    expect(fourth).toHaveAttribute('aria-current', 'true')
  })

  it('예매율이 낮으면 "매진 임박"이라고 하지 않고 "이번 주 인기 경기"로 보여 준다', async () => {
    stubGuest({ hotGames: [hotGame(7, 100), hotGame(8, 50)] })
    renderHero()

    expect(
      await screen.findByRole('heading', { name: /지금 예매할 수 있는 가까운 경기예요/, hidden: true }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '인기 경기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '매진 임박' })).not.toBeInTheDocument()
    expect(screen.queryByText(/자리가 얼마 안 남았어요/)).not.toBeInTheDocument()
    // 예매 중 표시이고, 마감 임박 칩은 없다.
    expect(screen.getAllByText('예매 중').length).toBeGreaterThan(0)
    expect(screen.queryByText('마감 임박')).not.toBeInTheDocument()
  })

  it('직관 챌린지: 비회원에게는 참여 로그인 링크를, 이벤트 설명을 보여 준다', async () => {
    stubGuest({ hotGames: [hotGame(7, 920)] })
    renderHero()

    await userEvent.click(await screen.findByRole('button', { name: '직관 챌린지 이벤트' }))
    const slide = screen.getAllByRole('group', { hidden: true })[1]
    expect(within(slide).getByText(/직관 요정/)).toBeInTheDocument()
    expect(within(slide).getByRole('link', { name: '로그인하고 참여하기' })).toHaveAttribute('href', '/login')
    expect(within(slide).getByRole('img', { name: '이번 달 직관 0 / 3경기' })).toBeInTheDocument()
  })

  it('직관 챌린지: 로그인하면 이번 달에 직관한 경기 수만큼 공이 채워진다', async () => {
    const month = todayInSeoul().slice(0, 8)
    const attended = (id: number, day: string) =>
      ({
        id,
        reservationNumber: 'BP' + id,
        status: 'CONFIRMED',
        totalPrice: 12000,
        paymentMethod: 'CARD',
        createdAt: '2026-09-01T10:00:00',
        canceledAt: null,
        cancelable: false,
        game: game(id, month + day, LG, DOOSAN, { status: 'FINISHED', homeScore: 3, awayScore: 1 }),
        seats: [],
      }) as unknown as Reservation
    // 이번 달 1일 새벽에 시작한 경기 둘은 이미 시작했으니 직관한 것으로 센다.
    const reservations = [
      { ...attended(21, '01'), game: { ...attended(21, '01').game, startAt: month + '01T00:10:00' } },
      { ...attended(22, '01'), game: { ...attended(22, '01').game, startAt: month + '01T00:20:00' } },
    ]
    restoreSessionAs(testMember('MEMBER'), (url) => handler({ hotGames: [hotGame(7, 920)], reservations })(url))
    renderHero()

    await userEvent.click(await screen.findByRole('button', { name: '직관 챌린지 이벤트' }))
    const slide = screen.getAllByRole('group', { hidden: true })[1]
    expect(await within(slide).findByRole('img', { name: '이번 달 직관 2 / 3경기' })).toBeInTheDocument()
    expect(within(slide).getByText('직관한 경기')).toBeInTheDocument()
    expect(within(slide).getByRole('link', { name: '경기 예매하러 가기' })).toHaveAttribute('href', '#schedule')
  })
})
