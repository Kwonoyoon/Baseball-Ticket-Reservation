import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Reservation } from '../api/types'
import { jsonResponse } from '../test/session'
import { MyTicketPage } from './MyTicketPage'

// 테스트에서는 QR을 실제로 그리지 않고, 무엇을 담았는지만 본다.
const toDataURL = vi.fn(async (text: string) => `data:image/png;base64,${btoa(encodeURIComponent(text))}`)
vi.mock('qrcode', () => ({ default: { toDataURL: (text: string) => toDataURL(text) } }))

const lg = { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' }
const kia = { id: 8, code: 'KIA', name: 'KIA 타이거즈', shortName: 'KIA', primaryColor: '#EA0029' }

function reservation(id: number, startAt: string, overrides: Partial<Reservation> = {}): Reservation {
  return {
    id,
    reservationNumber: `BP${id}`,
    status: 'CONFIRMED',
    totalPrice: 12000,
    paymentMethod: 'CARD',
    createdAt: '2026-10-01T10:00:00',
    canceledAt: null,
    paymentDeadline: null,
    cancelable: true,
    game: {
      id,
      startAt,
      homeTeam: lg,
      awayTeam: kia,
      stadium: { id: 1, name: '서울종합운동장 야구장', city: '서울', code: 'JAMSIL' },
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    },
    seats: [
      {
        sectionId: 11,
        sectionCode: 'NAVY-03',
        sectionName: '네이비석 3번',
        grade: 'NAVY',
        rowNo: 3,
        seatNo: id,
        seatRows: 10,
        seatsPerRow: 22,
        price: 12000,
      },
    ],
    ...overrides,
  }
}

function renderTickets(reservations: Reservation[], url = '/my/ticket') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      String(input) === '/api/reservations/me' ? jsonResponse(200, reservations) : jsonResponse(404, {}),
    ),
  )
  const router = createMemoryRouter([{ path: '/my/ticket', element: <MyTicketPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
}

/** 티켓 오른쪽 위의 입장 상태 배지 (QR을 그리는 동안의 '불러오는 중'도 status라 따로 찾는다) */
function entryStatus() {
  const badge = document.querySelector<HTMLElement>('.my-ticket__status')
  if (!badge) throw new Error('입장 상태 배지가 없습니다.')
  return badge
}

const findEntryStatus = () => waitFor(entryStatus)

describe('MyTicketPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    toDataURL.mockClear()
  })

  it('확정된 예매만 티켓으로, 다가오는 경기부터 보여 주고 예매번호를 담은 QR을 그린다', async () => {
    renderTickets([
      reservation(1, '2099-05-02T18:30:00'),
      reservation(2, '2099-05-01T18:30:00'),
      reservation(3, '2099-04-01T18:30:00', { status: 'CANCELED' }),
      reservation(4, '2020-04-01T18:30:00'),
    ])

    // 가장 가까운 다가오는 경기(2번)가 먼저 나온다. 취소된 3번은 티켓이 아니다.
    expect(await screen.findByText('BP2')).toBeInTheDocument()
    expect(screen.getByText('1 / 3 티켓')).toBeInTheDocument()
    // 2099-05-01은 금요일(평일): 18:30 경기는 1시간 30분 전인 17:00부터 입장
    expect(entryStatus()).toHaveTextContent('17:00부터 입장')
    expect(screen.getByText('네이비석 3번 3열 2번')).toBeInTheDocument()

    const qr = await screen.findByRole('img', { name: '입장 확인용 QR 코드' })
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png/)
    const payload = JSON.parse(toDataURL.mock.calls.at(-1)![0])
    expect(payload).toMatchObject({ type: 'BALLPARK_ENTRY_TICKET', reservationId: 2, reservationNumber: 'BP2' })
  })

  it('좌우 화살표로 티켓을 넘기고, 지난 경기는 지난 경기로 표시한다', async () => {
    renderTickets([reservation(1, '2099-05-01T18:30:00'), reservation(4, '2020-04-01T18:30:00')])

    await screen.findByText('BP1')
    await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
    expect(await screen.findByText('BP4')).toBeInTheDocument()
    expect(entryStatus()).toHaveTextContent('경기 종료')
    expect(screen.getByText('2 / 2 티켓')).toBeInTheDocument()

    // 끝에서 넘기면 처음으로 돌아간다.
    await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
    expect(await screen.findByText('BP1')).toBeInTheDocument()
  })

  it('입장 상태가 경기 시각에 맞춰 바뀐다: 평일은 1시간 30분 전, 주말은 2시간 전부터 입장', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      // 2026-10-10(토) 18:00 경기. 주말이라 16:00부터 입장
      vi.setSystemTime(new Date('2026-10-10T15:59:00+09:00'))
      renderTickets([reservation(1, '2026-10-10T18:00:00')])
      expect(await findEntryStatus()).toHaveTextContent('16:00부터 입장')

      await act(async () => vi.advanceTimersByTime(2 * 60_000))
      expect(entryStatus()).toHaveTextContent('입장 가능')

      // 경기가 시작돼도 입장할 수 있다
      await act(async () => vi.advanceTimersByTime(2 * 60 * 60_000))
      expect(entryStatus()).toHaveTextContent('경기 중 · 입장 가능')

      // 시작 4시간 뒤에는 끝난 경기로 본다
      await act(async () => vi.advanceTimersByTime(4 * 60 * 60_000))
      expect(entryStatus()).toHaveTextContent('경기 종료')
    } finally {
      vi.useRealTimers()
    }
  })

  it('평일 경기는 1시간 30분 전부터, 취소된 경기는 경기 취소로 보인다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      // 2026-10-13(화) 18:30 경기 → 17:00부터 입장
      vi.setSystemTime(new Date('2026-10-13T17:01:00+09:00'))
      const canceled = reservation(2, '2026-10-14T18:30:00')
      renderTickets([
        reservation(1, '2026-10-13T18:30:00'),
        { ...canceled, game: { ...canceled.game, status: 'CANCELED' } },
      ])
      expect(await findEntryStatus()).toHaveTextContent('입장 가능')

      await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
      expect(await screen.findByText('BP2')).toBeInTheDocument()
      expect(entryStatus()).toHaveTextContent('경기 취소')
    } finally {
      vi.useRealTimers()
    }
  })

  it('주소의 reservationId로 처음 볼 티켓을 고른다 (예매 상세의 QR 티켓 보기)', async () => {
    renderTickets(
      [reservation(1, '2099-05-01T18:30:00'), reservation(5, '2099-06-01T18:30:00')],
      '/my/ticket?reservationId=5',
    )

    expect(await screen.findByText('BP5')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 티켓')).toBeInTheDocument()
  })

  it('새로고침을 누르면 QR을 새로 그린다', async () => {
    renderTickets([reservation(1, '2099-05-01T18:30:00')])

    await screen.findByRole('img', { name: '입장 확인용 QR 코드' })
    const before = toDataURL.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: '↻ 새로고침' }))

    await waitFor(() => expect(toDataURL.mock.calls.length).toBe(before + 1))
    // 티켓이 한 장이면 넘기는 화살표가 없다.
    expect(screen.queryByRole('button', { name: '다음 티켓' })).not.toBeInTheDocument()
  })

  it('확정된 예매가 없으면 경기 일정으로 안내한다', async () => {
    renderTickets([reservation(3, '2099-04-01T18:30:00', { status: 'CANCELED' })])

    expect(await screen.findByRole('heading', { name: '예매 완료된 티켓이 없습니다.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '경기 일정 보기' })).toHaveAttribute('href', '/')
  })
})
