import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Reservation } from '../api/types'
import { MyReservationsPage } from './MyReservationsPage'

const team = { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' }

const reservation: Reservation = {
  id: 15,
  reservationNumber: 'R20260916-0001',
  status: 'CONFIRMED',
  totalPrice: 24000,
  paymentMethod: 'CARD',
  createdAt: '2026-09-16T10:00:00',
  canceledAt: null,
  paymentDeadline: null,
  cancelable: true,
  game: {
    id: 7,
    startAt: '2026-09-20T18:30:00',
    homeTeam: team,
    awayTeam: { ...team, id: 2, code: 'KIA', name: 'KIA 타이거즈', shortName: 'KIA' },
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
      seatNo: 7,
      seatRows: 10,
      seatsPerRow: 22,
      price: 12000,
    },
    {
      sectionId: 11,
      sectionCode: 'NAVY-03',
      sectionName: '네이비석 3번',
      grade: 'NAVY',
      rowNo: 3,
      seatNo: 8,
      seatRows: 10,
      seatsPerRow: 22,
      price: 12000,
    },
  ],
}

function renderPage() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify([reservation]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
  const router = createMemoryRouter([{ path: '/my/reservations', element: <MyReservationsPage /> }], {
    initialEntries: ['/my/reservations'],
  })
  render(<RouterProvider router={router} />)
}

describe('MyReservationsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('좌석 보기를 누르면 페이지를 옮기지 않고 좌석 위치를 펼친다', async () => {
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole('button', { name: '좌석 보기' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('img', { name: /내 좌석 위치/ })).not.toBeInTheDocument()

    await user.click(toggle)

    const detail = screen.getByRole('img', { name: '내 좌석 위치: 네이비석 3번 3열 7번, 3열 8번' })
    expect(detail).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '좌석 닫기' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('다시 누르면 접힌다', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: '좌석 보기' }))
    await user.click(screen.getByRole('button', { name: '좌석 닫기' }))

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /내 좌석 위치/ })).not.toBeInTheDocument()
    })
  })
})
