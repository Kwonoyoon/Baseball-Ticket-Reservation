import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminDashboard } from '../api/types'
import { jsonResponse } from '../test/session'
import { AdminDashboardPage } from './AdminDashboardPage'

const dashboard = (overrides: Partial<AdminDashboard> = {}): AdminDashboard => ({
  date: '2026-10-07',
  today: { reservations: 12, canceled: 3, revenue: 456000, newMembers: 5, entered: 2 },
  pending: { reports: 4, lockedMembers: 0, totalMembers: 130 },
  last7Days: [
    { date: '2026-10-01', reservations: 0, canceled: 0, revenue: 0 },
    { date: '2026-10-02', reservations: 4, canceled: 1, revenue: 120000 },
    { date: '2026-10-03', reservations: 8, canceled: 0, revenue: 240000 },
    { date: '2026-10-04', reservations: 2, canceled: 0, revenue: 60000 },
    { date: '2026-10-05', reservations: 6, canceled: 2, revenue: 180000 },
    { date: '2026-10-06', reservations: 10, canceled: 1, revenue: 300000 },
    { date: '2026-10-07', reservations: 12, canceled: 3, revenue: 456000 },
  ],
  topGames: [
    {
      gameId: 7,
      homeTeam: 'LG 트윈스',
      awayTeam: 'KT 위즈',
      startAt: '2026-10-09T18:30:00',
      sold: 450,
      capacity: 500,
      rate: 90,
    },
  ],
  ...overrides,
})

function renderDashboard() {
  const router = createMemoryRouter([{ path: '/admin', element: <AdminDashboardPage /> }], {
    initialEntries: ['/admin'],
  })
  render(<RouterProvider router={router} />)
}

describe('AdminDashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('오늘 숫자와 챙길 일, 예매율 순위를 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/admin/dashboard') return jsonResponse(200, dashboard())
        return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
      }),
    )
    renderDashboard()

    expect(await screen.findByRole('heading', { name: '관리자 대시보드' })).toBeInTheDocument()
    expect(screen.getByText('2026-10-07 기준')).toBeInTheDocument()

    const today = screen.getByRole('region', { name: '오늘 현황' })
    expect(within(today).getByText('12건')).toBeInTheDocument() // 예매
    expect(within(today).getByText('3건')).toBeInTheDocument() // 취소
    expect(within(today).getByText('456,000원')).toBeInTheDocument() // 매출
    expect(within(today).getByText('5명')).toBeInTheDocument() // 신규 가입

    // 신고가 있으면 신고 관리로 가는 카드가 강조된다. 잠긴 계정이 0이면 강조하지 않는다.
    const reports = screen.getByRole('link', { name: /커뮤니티 신고/ })
    expect(reports).toHaveAttribute('href', '/admin/community/reports')
    expect(reports).toHaveClass('is-alert')
    expect(screen.getByRole('link', { name: /잠긴 계정/ })).not.toHaveClass('is-alert')

    const game = screen.getByRole('progressbar', { name: 'KT 위즈 vs LG 트윈스 예매율' })
    expect(game).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('450석')).toBeInTheDocument()
    expect(screen.getByText(/전체 500석/)).toBeInTheDocument()
  })

  it('1% 미만 예매율도 0%로 뭉개지 않고 소수점으로 보여 주고, 막대는 눈에 보이게 남긴다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          200,
          dashboard({
            topGames: [
              { gameId: 8, homeTeam: 'SSG 랜더스', awayTeam: '키움 히어로즈', startAt: '2026-10-09T18:30:00', sold: 4, capacity: 9761, rate: 0.04 },
              { gameId: 9, homeTeam: '두산 베어스', awayTeam: '한화 이글스', startAt: '2026-10-10T18:30:00', sold: 0, capacity: 10142, rate: 0 },
            ],
          }),
        ),
      ),
    )
    renderDashboard()

    expect(await screen.findByText('0.04%')).toBeInTheDocument()
    const sold = screen.getByRole('progressbar', { name: '키움 히어로즈 vs SSG 랜더스 예매율' })
    expect(sold.firstElementChild).toHaveStyle({ width: '2%' }) // 최소 너비로 눈에 보인다
    // 한 석도 안 팔린 경기는 막대를 비운다.
    const empty = screen.getByRole('progressbar', { name: '한화 이글스 vs 두산 베어스 예매율' })
    expect(empty.firstElementChild).toHaveStyle({ width: '0%' })
  })

  it('최근 7일 그래프에 합계와 날짜별 값이 나온다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, dashboard())),
    )
    renderDashboard()

    const chart = await screen.findByRole('img', { name: /최근 7일 예매 추이/ })
    expect(chart).toHaveAccessibleName('최근 7일 예매 추이. 합계 예매 42건, 취소 7건')

    const summary = screen.getByRole('region', { name: '최근 7일 예매' })
    expect(within(summary).getByText('42건')).toBeInTheDocument() // 7일 예매 합계
    expect(within(summary).getByText('7건')).toBeInTheDocument() // 7일 취소 합계
    expect(within(summary).getByText('1,356,000원')).toBeInTheDocument() // 7일 매출 합계
    // 맨 오른쪽 날짜는 "오늘"로 표시한다.
    expect(within(chart as unknown as HTMLElement).getByText('오늘')).toBeInTheDocument()
    expect(within(chart as unknown as HTMLElement).getByText('10/07')).toBeInTheDocument()
  })

  it('앞으로 열릴 경기가 없으면 안내 문구를 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, dashboard({ topGames: [] }))),
    )
    renderDashboard()

    expect(await screen.findByText('앞으로 열릴 경기가 없어요.')).toBeInTheDocument()
  })

  it('불러오지 못하면 오류를 보여 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { code: 'INTERNAL', message: '서버 오류' })),
    )
    renderDashboard()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
