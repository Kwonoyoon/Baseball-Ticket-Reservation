import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Transfer } from '../api/types'
import { jsonResponse } from '../test/session'
import { TransferMarketPage } from './TransferMarketPage'

const team = { id: 1, code: 'LG', name: 'LG 트윈스', shortName: 'LG', primaryColor: '#C30452' }

const game = {
  id: 7,
  startAt: '2026-10-20T18:30:00',
  homeTeam: team,
  awayTeam: { ...team, id: 2, code: 'KIA', name: 'KIA 타이거즈', shortName: 'KIA' },
  stadium: { id: 1, name: '서울종합운동장 야구장', city: '서울' },
  status: 'SCHEDULED' as const,
  homeScore: null,
  awayScore: null,
}

const transfer = (overrides: Partial<Transfer>): Transfer => ({
  id: 1,
  status: 'OPEN',
  price: 24000,
  createdAt: '2026-10-05T10:00:00',
  mine: false,
  sellerName: '홍**',
  game,
  seats: ['네이비석 3번 3열 7번', '네이비석 3번 3열 8번'],
  ...overrides,
})

function renderPage(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', fetchMock)
  const router = createMemoryRouter([{ path: '/transfers', element: <TransferMarketPage /> }], {
    initialEntries: ['/transfers'],
  })
  render(<RouterProvider router={router} />)
  return fetchMock
}

describe('TransferMarketPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('판매 중인 글에는 정가와 마스킹된 판매자를 보여 주고, 내가 올린 글에는 거두기를 둔다', async () => {
    renderPage((url) => {
      if (url === '/api/transfers') {
        return jsonResponse(200, [transfer({ id: 1 }), transfer({ id: 2, mine: true, price: 12000 })])
      }
      if (url === '/api/transfers/me') return jsonResponse(200, [transfer({ id: 2, mine: true, status: 'SOLD' })])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })

    const open = await screen.findByRole('region', { name: '지금 살 수 있는 티켓' })
    expect(within(open).getAllByText('판매자 홍**')).toHaveLength(2)
    expect(within(open).getByText('24,000원')).toBeInTheDocument()
    // 남의 글은 구매, 내 글은 거두기만 보인다.
    expect(within(open).getAllByRole('button', { name: '구매하기' })).toHaveLength(1)
    expect(within(open).getByRole('button', { name: '내 글 거두기' })).toBeInTheDocument()

    const mine = screen.getByRole('region', { name: '내가 올린 양도글' })
    expect(within(mine).getByText('판매 완료')).toBeInTheDocument()
  })

  it('구매하기를 누르고 확인하면 고른 결제 수단으로 서버에 보내고 목록을 다시 받는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = renderPage((url, init) => {
      if (url === '/api/transfers/1/buy' && init?.method === 'POST') return new Response(null, { status: 204 })
      if (url === '/api/transfers') return jsonResponse(200, [transfer({ id: 1 })])
      if (url === '/api/transfers/me') return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })

    const open = await screen.findByRole('region', { name: '지금 살 수 있는 티켓' })
    await userEvent.selectOptions(within(open).getByLabelText('결제 수단'), 'KAKAO_PAY')
    await userEvent.click(within(open).getByRole('button', { name: '구매하기' }))

    expect(await screen.findByText(/양도받았습니다/)).toBeInTheDocument()
    const buyCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/transfers/1/buy')
    expect(JSON.parse(String(buyCall?.[1]?.body))).toEqual({ paymentMethod: 'KAKAO_PAY' })
    // 성공이든 실패든 목록을 다시 받는다. (이미 팔린 글일 수 있어서)
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/transfers').length).toBeGreaterThan(1),
    )
  })

  it('이미 팔린 글을 누르면 서버의 안내 문구를 그대로 보여 준다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage((url, init) => {
      if (url === '/api/transfers/1/buy' && init?.method === 'POST') {
        return jsonResponse(409, { code: 'TRANSFER_CLOSED', message: '이미 판매되었거나 거둬들인 양도글입니다.' })
      }
      if (url === '/api/transfers') return jsonResponse(200, [transfer({ id: 1 })])
      if (url === '/api/transfers/me') return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })

    await userEvent.click(await screen.findByRole('button', { name: '구매하기' }))

    expect(await screen.findByText('이미 판매되었거나 거둬들인 양도글입니다.')).toBeInTheDocument()
  })

  it('확인창에서 취소하면 서버에 보내지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderPage((url) => {
      if (url === '/api/transfers') return jsonResponse(200, [transfer({ id: 1 })])
      if (url === '/api/transfers/me') return jsonResponse(200, [])
      return jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
    })

    await userEvent.click(await screen.findByRole('button', { name: '구매하기' }))

    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/buy'))).toBe(false)
  })
})
