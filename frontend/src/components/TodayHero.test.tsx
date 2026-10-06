import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary, Team } from '../api/types'
import { addDays, todayInSeoul } from '../lib/format'
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

function game(id: number, date: string, home: Team, away: Team): GameSummary {
  return {
    id,
    startAt: `${date}T18:30:00`,
    homeTeam: home,
    awayTeam: away,
    stadium: { id: id, name: `${home.shortName}구장`, city: '서울', code: 'JAMSIL' },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
  }
}

/** 요청한 날짜(date 쿼리)별로 준비해 둔 경기를 돌려주는 가짜 서버 */
function stubSchedule(byDate: Record<string, GameSummary[]>) {
  const fetchMock = vi.fn((url: string) => {
    const date = new URL(url, 'http://localhost').searchParams.get('date') ?? ''
    return Promise.resolve(
      new Response(JSON.stringify(byDate[date] ?? []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('TodayHero', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('오늘 경기마다 슬라이드와 이동 점을 만든다', async () => {
    const today = todayInSeoul()
    stubSchedule({ [today]: [game(1, today, LG, DOOSAN), game(2, today, KIA, NC)] })

    render(<TodayHero />)

    expect(await screen.findByRole('button', { name: 'Doosan Bears 대 LG Twins' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'NC Dinos 대 KIA Tigers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today KBO')
    expect(screen.getByText(/오늘 경기 · 2026 KBO 리그/)).toBeInTheDocument()
  })

  it('점을 누르면 그 경기가 현재 슬라이드가 된다', async () => {
    const today = todayInSeoul()
    stubSchedule({ [today]: [game(1, today, LG, DOOSAN), game(2, today, KIA, NC)] })
    render(<TodayHero />)

    const first = await screen.findByRole('button', { name: 'Doosan Bears 대 LG Twins' })
    const second = screen.getByRole('button', { name: 'NC Dinos 대 KIA Tigers' })
    expect(first).toHaveAttribute('aria-current', 'true')
    expect(second).toHaveAttribute('aria-current', 'false')

    await userEvent.setup().click(second)

    expect(second).toHaveAttribute('aria-current', 'true')
    expect(first).toHaveAttribute('aria-current', 'false')
  })

  it('화면에 보이지 않는 슬라이드는 보조기기에서 숨긴다', async () => {
    const today = todayInSeoul()
    stubSchedule({ [today]: [game(1, today, LG, DOOSAN), game(2, today, KIA, NC)] })
    render(<TodayHero />)

    const slides = await screen.findAllByRole('group', { hidden: true })
    expect(slides.map((slide) => slide.getAttribute('aria-hidden'))).toEqual(['false', 'true'])
  })

  it('오늘 경기가 없으면(월요일 휴식일) 다음 경기일의 경기를 보여준다', async () => {
    const today = todayInSeoul()
    const tomorrow = addDays(today, 1)
    const fetchMock = stubSchedule({ [tomorrow]: [game(9, tomorrow, LG, DOOSAN)] })

    render(<TodayHero />)

    const slide = (await screen.findAllByRole('group', { hidden: true }))[0]
    // 오늘이 아니므로 "오늘 · 구장" 대신 "월.일 · 구장"으로 표시한다.
    expect(within(slide).getByText(/^\d+\.\d+ · LG구장$/)).toBeInTheDocument()
    // 오늘, 내일 두 날짜만 조회한다. (뉴스 요청은 일정 조회가 아니라서 센다고 하지 않는다)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/games'))).toHaveLength(2)
  })

  it('가까운 날짜에 경기가 하나도 없으면 안내 문구를 보여준다', async () => {
    stubSchedule({})

    render(<TodayHero />)

    expect(await screen.findByText('예정된 경기가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('경기 정보를 불러오지 못해도 히어로 문구는 남는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    render(<TodayHero />)

    expect(await screen.findByText('경기 정보를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today KBO')
  })

  it('경기 슬라이드 뒤에 KBO 뉴스를 붙이고, 뉴스 슬라이드의 링크는 새 탭으로 연다', async () => {
    const today = todayInSeoul()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const body = String(url).startsWith('/api/news')
          ? [
              {
                title: '프로야구, 역대 최다관중 달성',
                link: 'https://www.yna.co.kr/view/A1',
                source: '연합뉴스',
                imageUrl: null,
                publishedAt: '2026-10-06T12:04:05',
              },
            ]
          : [game(1, today, LG, DOOSAN)]
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        )
      }),
    )

    render(<TodayHero />)

    const link = await screen.findByRole('link', { name: /프로야구, 역대 최다관중 달성/, hidden: true })
    expect(link).toHaveAttribute('href', 'https://www.yna.co.kr/view/A1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveTextContent('연합뉴스')
    // 경기 1개 + 뉴스 1개 = 점 2개, 뉴스는 경기 뒤(맨 끝)에 온다.
    const dots = screen.getAllByRole('button')
    expect(dots).toHaveLength(2)
    expect(dots[1]).toHaveAccessibleName(/KBO 뉴스/)
    // 화면에 안 보이는 뉴스 링크는 키보드로 잡히지 않는다.
    expect(link).toHaveAttribute('tabindex', '-1')
  })

  it('뉴스를 불러오지 못해도 경기 슬라이드는 그대로 보인다', async () => {
    const today = todayInSeoul()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        String(url).startsWith('/api/news')
          ? Promise.resolve(new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }))
          : Promise.resolve(
              new Response(JSON.stringify([game(1, today, LG, DOOSAN)]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            ),
      ),
    )

    render(<TodayHero />)

    expect(await screen.findAllByRole('group', { hidden: true })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: /KBO 뉴스/, hidden: true })).not.toBeInTheDocument()
  })
})
