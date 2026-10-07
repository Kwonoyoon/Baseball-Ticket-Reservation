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

const HOUR = 60 * 60_000

/** 서울 시각 문자열(서버 형식) ↔ 밀리초 */
const seoul = (value: string) => Date.parse(`${value}+09:00`)
const toSeoulString = (time: number) => new Date(time + 9 * HOUR).toISOString().slice(0, 19)

/** 예매별로 입장 QR을 발급한 횟수 */
let issued: Record<number, number> = {}

type ServerOptions = { entryOpensAt?: Record<number, string>; failIssue?: boolean }

/**
 * 가짜 서버. 입장 시작은 기본으로 평일 규칙(1시간 30분 전)이고 entryOpensAt으로 바꿀 수 있다.
 * 끝났거나 취소된 경기는 QR 값을 주지 않는다.
 */
function renderTickets(reservations: Reservation[], url = '/my/ticket', options: ServerOptions = {}) {
  issued = {}
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/reservations/me') return jsonResponse(200, reservations)
      const match = /^\/api\/reservations\/(\d+)\/entry-ticket$/.exec(path)
      if (!match || init?.method !== 'POST') return jsonResponse(404, {})
      if (options.failIssue) {
        return jsonResponse(409, {
          code: 'ENTRY_TICKET_UNAVAILABLE',
          message: '결제가 완료된 예매만 입장 QR을 받을 수 있습니다.',
        })
      }
      const ticket = reservations.find((r) => r.id === Number(match[1]))!
      const start = seoul(ticket.game.startAt)
      const ends = start + 4 * HOUR
      const usable = ticket.game.status === 'SCHEDULED' && Date.now() < ends
      issued[ticket.id] = (issued[ticket.id] ?? 0) + 1
      return jsonResponse(200, {
        entryOpensAt: options.entryOpensAt?.[ticket.id] ?? toSeoulString(start - 1.5 * HOUR),
        gameStartsAt: ticket.game.startAt,
        gameEndsAt: toSeoulString(ends),
        token: usable ? `signed-${ticket.id}-${issued[ticket.id]}` : null,
        expiresInSeconds: usable ? 30 : null,
      })
    }),
  )
  const router = createMemoryRouter([{ path: '/my/ticket', element: <MyTicketPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
}

/** 티켓 오른쪽 위의 입장 상태 배지 (QR을 받는 동안의 '불러오는 중'도 status라 따로 찾는다) */
function entryStatus() {
  const badge = document.querySelector<HTMLElement>('.my-ticket__status')
  if (!badge) throw new Error('입장 상태 배지가 없습니다.')
  return badge
}

const findQr = () => screen.findByRole('img', { name: '입장 확인용 QR 코드' })

describe('MyTicketPage', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    toDataURL.mockClear()
  })

  it('확정된 예매만 티켓으로, 다가오는 경기부터 보여 주고 서버가 서명한 값을 그대로 QR로 그린다', async () => {
    renderTickets([
      reservation(1, '2099-05-02T18:30:00'),
      reservation(2, '2099-05-01T18:30:00'),
      reservation(3, '2099-04-01T18:30:00', { status: 'CANCELED' }),
      reservation(4, '2020-04-01T18:30:00'),
    ])

    // 가장 가까운 다가오는 경기(2번)가 먼저 나온다. 취소된 3번은 티켓이 아니다.
    expect(await screen.findByText('BP2')).toBeInTheDocument()
    expect(screen.getByText('1 / 3 티켓')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '네이비석 3번 3열 2번 위치 보기' })).toBeInTheDocument()

    expect((await findQr()).getAttribute('src')).toMatch(/^data:image\/png/)
    expect(toDataURL).toHaveBeenLastCalledWith('signed-2-1')
    expect(entryStatus()).toHaveTextContent('17:00부터 입장')
  })

  it('입장 시작 시각은 서버가 정한 값을 쓴다 (주말·공휴일은 서버가 2시간 전으로 준다)', async () => {
    // 2099-05-05 어린이날
    renderTickets([reservation(1, '2099-05-05T18:30:00')], '/my/ticket', {
      entryOpensAt: { 1: '2099-05-05T16:30:00' },
    })

    await findQr()
    expect(entryStatus()).toHaveTextContent('16:30부터 입장')
  })

  it('입장 상태가 서버가 준 시각에 맞춰 바뀐다: 입장 전 → 입장 가능 → 경기 중 → 경기 종료', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // 18:00 경기, 서버가 16:00부터 입장이라고 준다.
    vi.setSystemTime(new Date('2026-10-10T15:59:00+09:00'))
    renderTickets([reservation(1, '2026-10-10T18:00:00')], '/my/ticket', {
      entryOpensAt: { 1: '2026-10-10T16:00:00' },
    })
    await findQr()
    expect(entryStatus()).toHaveTextContent('16:00부터 입장')

    await act(async () => vi.advanceTimersByTime(2 * 60_000))
    await waitFor(() => expect(entryStatus()).toHaveTextContent('입장 가능'))

    await act(async () => vi.advanceTimersByTime(2 * HOUR))
    await waitFor(() => expect(entryStatus()).toHaveTextContent('경기 중 · 입장 가능'))

    // 서버가 준 gameEndsAt(시작 4시간 뒤)부터는 끝난 경기
    await act(async () => vi.advanceTimersByTime(4 * HOUR))
    await waitFor(() => expect(entryStatus()).toHaveTextContent('경기 종료'))
  })

  it('QR은 30초마다, 또는 새로고침을 누르면 서버에서 새 값을 받아 다시 그린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderTickets([reservation(1, '2099-05-01T18:30:00')])

    await findQr()
    expect(toDataURL).toHaveBeenLastCalledWith('signed-1-1')
    expect(screen.getByRole('timer')).toHaveTextContent('00:30')

    await act(async () => vi.advanceTimersByTime(30_500))
    await waitFor(() => expect(toDataURL).toHaveBeenLastCalledWith('signed-1-2'))

    await userEvent.click(screen.getByRole('button', { name: '↻ 새로고침' }))
    await waitFor(() => expect(toDataURL).toHaveBeenLastCalledWith('signed-1-3'))
    // 티켓이 한 장이면 넘기는 화살표가 없다.
    expect(screen.queryByRole('button', { name: '다음 티켓' })).not.toBeInTheDocument()
  })

  it('좌우 화살표로 티켓을 넘기고, 끝난 경기와 취소된 경기는 QR 없이 안내한다', async () => {
    const canceled = reservation(5, '2099-06-01T18:30:00')
    renderTickets([
      reservation(1, '2099-05-01T18:30:00'),
      reservation(4, '2020-04-01T18:30:00'),
      { ...canceled, game: { ...canceled.game, status: 'CANCELED' } },
    ])

    await screen.findByText('BP1')
    await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
    expect(await screen.findByText('BP5')).toBeInTheDocument()
    expect(entryStatus()).toHaveTextContent('경기 취소')
    expect(await screen.findByText('취소된 경기라 입장 QR이 없습니다.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
    expect(await screen.findByText('BP4')).toBeInTheDocument()
    expect(await screen.findByText('끝난 경기라 입장 QR이 없습니다.')).toBeInTheDocument()
    expect(entryStatus()).toHaveTextContent('경기 종료')
    expect(screen.queryByRole('img', { name: '입장 확인용 QR 코드' })).not.toBeInTheDocument()
    expect(screen.getByText('3 / 3 티켓')).toBeInTheDocument()

    // 끝에서 넘기면 처음으로 돌아간다.
    await userEvent.click(screen.getByRole('button', { name: '다음 티켓' }))
    expect(await screen.findByText('BP1')).toBeInTheDocument()
  })

  it('QR을 받지 못하면 서버가 알려 준 이유를 보여 준다', async () => {
    renderTickets([reservation(1, '2099-05-01T18:30:00')], '/my/ticket', { failIssue: true })

    expect(await screen.findByRole('alert')).toHaveTextContent('결제가 완료된 예매만 입장 QR을 받을 수 있습니다.')
    expect(screen.queryByRole('img', { name: '입장 확인용 QR 코드' })).not.toBeInTheDocument()
  })

  it('좌석은 구역별로 열·번을 보여 주고, 누르면 구장 배치도에서 블록 안 위치까지 보여 준다', async () => {
    const user = userEvent.setup()
    const base = reservation(1, '2099-05-01T18:30:00')
    renderTickets([{ ...base, seats: [base.seats[0], { ...base.seats[0], seatNo: 8 }] }])
    await screen.findByText('BP1')
    expect(screen.getByRole('heading', { name: '좌석 2석' })).toBeInTheDocument()
    expect(screen.getByText('네이비석 3번')).toBeInTheDocument()

    // 처음에는 배치도를 접어 둔다.
    const toggle = screen.getByRole('button', { name: '좌석 위치 보기' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('img', { name: /내 좌석 위치/ })).not.toBeInTheDocument()

    // 좌석을 누르면 배치도를 펼치고 그 블록 안 자리를 짚어 준다.
    const eighth = screen.getByRole('button', { name: '네이비석 3번 3열 8번 위치 보기' })
    await user.click(eighth)
    expect(screen.getByRole('img', { name: '내 좌석 위치: 네이비석 3번 3열 1번, 3열 8번' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /네이비석 3번 10열 22석 중 내 좌석/ })).toBeInTheDocument()
    expect(eighth).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '좌석 위치 닫기' })).toHaveAttribute('aria-expanded', 'true')

    // 같은 좌석을 다시 누르면 블록 안 좌석표만 접힌다.
    await user.click(eighth)
    expect(screen.queryByRole('group', { name: /10열 22석 중 내 좌석/ })).not.toBeInTheDocument()
    expect(eighth).toHaveAttribute('aria-pressed', 'false')

    // 배치도의 블록을 눌러도 위쪽 좌석 선택이 따라온다.
    await user.click(screen.getByRole('button', { name: '네이비석 3번 좌석표 보기' }))
    expect(screen.getByRole('button', { name: '네이비석 3번 3열 1번 위치 보기' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '좌석 위치 닫기' }))
    expect(screen.queryByRole('img', { name: /내 좌석 위치/ })).not.toBeInTheDocument()
  })

  it('배치도가 없는 구장이면 좌석만 적고 위치 보기 버튼은 없다', async () => {
    const base = reservation(1, '2099-05-01T18:30:00')
    renderTickets([{ ...base, game: { ...base.game, stadium: { ...base.game.stadium, code: null } } }])
    await screen.findByText('BP1')

    expect(screen.getByText('네이비석 3번')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '좌석 위치 보기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /위치 보기/ })).not.toBeInTheDocument()
  })

  it('주소의 reservationId로 처음 볼 티켓을 고른다 (예매 상세의 QR 티켓 보기)', async () => {
    renderTickets(
      [reservation(1, '2099-05-01T18:30:00'), reservation(5, '2099-06-01T18:30:00')],
      '/my/ticket?reservationId=5',
    )

    expect(await screen.findByText('BP5')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 티켓')).toBeInTheDocument()
  })

  it('확정된 예매가 없으면 경기 일정으로 안내한다', async () => {
    renderTickets([reservation(3, '2099-04-01T18:30:00', { status: 'CANCELED' })])

    expect(await screen.findByRole('heading', { name: '예매 완료된 티켓이 없습니다.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '경기 일정 보기' })).toHaveAttribute('href', '/')
  })
})
