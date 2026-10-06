import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { PaymentFailPage, PaymentSuccessPage } from './PaymentResultPage'

function Landing() {
  const location = useLocation()
  return <output aria-label="이동한 주소">{location.pathname}</output>
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/payments/success', element: <PaymentSuccessPage /> },
      { path: '/payments/fail', element: <PaymentFailPage /> },
      { path: '/reservations/:reservationId', element: <Landing /> },
    ],
    { initialEntries: [url] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('PaymentSuccessPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('결제 확정을 한 번만 요청하고, 끝나면 예매 상세로 간다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url) =>
      url === '/api/reservations/confirm' ? jsonResponse(200, { id: 77, status: 'CONFIRMED' }) : undefined,
    )
    renderAt('/payments/success?paymentKey=mpk_test&orderId=BP1&amount=16000')

    expect(await screen.findByLabelText('이동한 주소')).toHaveTextContent('/reservations/77')
    const confirms = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/reservations/confirm')
    expect(confirms).toHaveLength(1)
    expect(JSON.parse(String((confirms[0][1] as RequestInit).body))).toEqual({
      paymentKey: 'mpk_test',
      orderId: 'BP1',
      amount: 16000,
    })
  })

  it('결제 시간이 지나 확정하지 못하면 이유를 보여 준다', async () => {
    restoreSessionAs(testMember(), (url) =>
      url === '/api/reservations/confirm'
        ? jsonResponse(409, { code: 'PAYMENT_EXPIRED', message: '결제 시간이 지나 예매가 취소되었습니다.' })
        : undefined,
    )
    renderAt('/payments/success?paymentKey=mpk_test&orderId=BP1&amount=16000')

    expect(await screen.findByRole('alert')).toHaveTextContent('결제 시간이 지나 예매가 취소되었습니다.')
    expect(screen.getByRole('link', { name: '경기 일정으로' })).toHaveAttribute('href', '/')
  })
})

describe('PaymentFailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('결제 대기 예매를 정리하고 같은 경기에서 좌석을 다시 고르게 안내한다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url) =>
      url === '/api/reservations/abandon' ? jsonResponse(200, { gameId: 12 }) : undefined,
    )
    renderAt('/payments/fail?code=REJECT_LIMIT_EXCEEDED&message=%EC%B9%B4%EB%93%9C%20%ED%95%9C%EB%8F%84&orderId=BP1')

    expect(screen.getByRole('heading', { name: '결제가 완료되지 않았어요' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('카드 한도')
    expect(await screen.findByRole('link', { name: '좌석 다시 고르기' })).toHaveAttribute('href', '/games/12')
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([input]) => String(input) === '/api/reservations/abandon')).toHaveLength(1),
    )
  })

  it('사용자가 취소했으면 취소 문구를 보여 준다', async () => {
    restoreSessionAs(testMember(), (url) =>
      url === '/api/reservations/abandon' ? jsonResponse(200, { gameId: 12 }) : undefined,
    )
    renderAt('/payments/fail?code=PAY_PROCESS_CANCELED&message=x&orderId=BP1')

    expect(screen.getByRole('heading', { name: '결제를 취소했어요' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
