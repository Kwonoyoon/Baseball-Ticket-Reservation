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
    stadium: { id: id, name: `${home.shortName}구장`, city: '서울' },
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

    expect(await screen.findByRole('button', { name: '두산 베어스 대 LG 트윈스' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'NC 다이노스 대 KIA 타이거즈' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today KBO')
    expect(screen.getByText(/오늘 경기 · 2026 KBO 리그/)).toBeInTheDocument()
  })

  it('점을 누르면 그 경기가 현재 슬라이드가 된다', async () => {
    const today = todayInSeoul()
    stubSchedule({ [today]: [game(1, today, LG, DOOSAN), game(2, today, KIA, NC)] })
    render(<TodayHero />)

    const first = await screen.findByRole('button', { name: '두산 베어스 대 LG 트윈스' })
    const second = screen.getByRole('button', { name: 'NC 다이노스 대 KIA 타이거즈' })
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
    expect(fetchMock).toHaveBeenCalledTimes(2)
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
})
