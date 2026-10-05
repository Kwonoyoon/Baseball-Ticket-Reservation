import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reservation, ReservationStatus, Team } from '../api/types'
import { CalendarPage } from './CalendarPage'

const team = (id: number, name: string): Team => ({ id, code: name, name, shortName: name, primaryColor: '#123456' })

function reservation(id: number, startAt: string, status: ReservationStatus = 'CONFIRMED'): Reservation {
  return {
    id,
    reservationNumber: `R${id}`,
    status,
    totalPrice: 40000,
    paymentMethod: 'CARD',
    createdAt: '2026-08-01T10:00:00',
    canceledAt: null,
    cancelable: false,
    game: {
      id,
      startAt,
      homeTeam: team(1, 'LG 트윈스'),
      awayTeam: team(2, '두산 베어스'),
      stadium: { id: 1, name: '잠실야구장', city: '서울' },
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    },
    seats: [1, 2].map((seatNo) => ({
      sectionId: 1,
      sectionCode: null,
      sectionName: '1루 내야석',
      grade: 'INFIELD' as const,
      rowNo: 1,
      seatNo,
      seatRows: 10,
      seatsPerRow: 20,
      price: 20000,
    })),
  }
}

function stubReservations(reservations: Reservation[] | 'error') {
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(
      reservations === 'error'
        ? new Response(JSON.stringify({ code: 'X', message: '서버 오류' }), { status: 500 })
        : new Response(JSON.stringify(reservations), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
}

function renderPage() {
  const router = createMemoryRouter([{ path: '/my/calendar', element: <CalendarPage /> }], {
    initialEntries: ['/my/calendar'],
  })
  render(<RouterProvider router={router} />)
}

describe('CalendarPage', () => {
  beforeEach(() => {
    // 오늘을 서울 시각 2026-09-27로 고정한다. 타이머는 건드리지 않고 Date만 바꿔서 fetch·렌더링은 그대로 동작한다.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-27T12:00:00+09:00') })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('이번 달을 보여주고, 직관한 날과 예매해 둔 날만 눌러볼 수 있는 버튼으로 표시한다', async () => {
    stubReservations([
      reservation(1, '2026-09-05T18:30:00'),
      reservation(2, '2026-09-10T18:30:00', 'CANCELED'),
      reservation(3, '2026-09-30T18:30:00'),
    ])
    renderPage()

    expect(await screen.findByRole('heading', { name: '2026년 9월' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9월 5일 (토), 직관 1경기' })).toBeInTheDocument()
    // 아직 오지 않은 확정 예매(30일)는 "예매"로 따로 표시되고, 취소한 예매(10일)는 버튼이 아니다.
    expect(screen.getByRole('button', { name: '9월 30일 (수), 예매 1경기' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /직관 \d경기/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /9월 10일/ })).not.toBeInTheDocument()
    expect(screen.getByText('1경기')).toBeInTheDocument()
    expect(screen.getByText(/전체 1경기/)).toBeInTheDocument()
    expect(screen.getByText(/예매한 예정 1경기/)).toBeInTheDocument()
  })

  it('예정인 날을 누르면 "예매 예정"으로, 다녀온 날은 "직관 완료"로 표시한다', async () => {
    stubReservations([reservation(1, '2026-09-05T18:30:00'), reservation(2, '2026-09-30T18:30:00')])
    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '9월 30일 (수), 예매 1경기' }))
    expect(screen.getByText('예매 예정')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '9월 5일 (토), 직관 1경기' }))
    expect(screen.getByText('직관 완료')).toBeInTheDocument()
  })

  it('창으로 돌아오면(focus) 예매 내역을 다시 불러와 방금 한 예매가 보인다', async () => {
    stubReservations([])
    renderPage()
    await screen.findByText(/아직 직관한 경기가 없습니다/)

    stubReservations([reservation(1, '2026-09-30T18:30:00')])
    window.dispatchEvent(new Event('focus'))

    expect(await screen.findByRole('button', { name: '9월 30일 (수), 예매 1경기' })).toBeInTheDocument()
  })

  it('날짜를 누르면 그날의 경기를 보여주고, 다시 누르면 닫는다', async () => {
    stubReservations([reservation(1, '2026-09-05T18:30:00')])
    renderPage()
    const user = userEvent.setup()

    const day = await screen.findByRole('button', { name: '9월 5일 (토), 직관 1경기' })
    await user.click(day)

    expect(screen.getByText('두산 베어스 vs LG 트윈스')).toBeInTheDocument()
    expect(screen.getByText('18:30 · 잠실야구장 · 2석')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '예매 상세' })).toHaveAttribute('href', '/reservations/1')

    await user.click(day)
    expect(screen.queryByText('두산 베어스 vs LG 트윈스')).not.toBeInTheDocument()
  })

  it('이전 달·다음 달로 옮기면 그 달의 기록이 보인다', async () => {
    stubReservations([reservation(1, '2026-08-30T18:30:00')])
    renderPage()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: '2026년 9월' })
    expect(screen.queryByRole('button', { name: /직관 \d경기/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이전 달' }))

    expect(screen.getByRole('heading', { name: '2026년 8월' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '8월 30일 (일), 직관 1경기' })).toBeInTheDocument()
  })

  it('같은 날 두 경기면 개수를 표시한다', async () => {
    stubReservations([reservation(1, '2026-09-05T14:00:00'), reservation(2, '2026-09-05T18:30:00')])
    renderPage()

    expect(await screen.findByRole('button', { name: '9월 5일 (토), 직관 2경기' })).toHaveTextContent('52')
  })

  it('직관 기록이 하나도 없으면 안내 문구를 보여준다', async () => {
    stubReservations([])
    renderPage()

    expect(await screen.findByText(/아직 직관한 경기가 없습니다/)).toBeInTheDocument()
  })

  it('불러오지 못하면 오류와 다시 시도 버튼을 보여준다', async () => {
    stubReservations('error')
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('서버 오류')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
