import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { checkoutUrl } from '../lib/mockPg'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { MockCheckoutPage } from './MockCheckoutPage'

function Landing() {
  const location = useLocation()
  return <output aria-label="이동한 주소">{location.pathname + location.search}</output>
}

const order = {
  orderId: 'BP261006ABC123',
  orderName: 'KIA vs LG 2매',
  amount: 32000,
  method: 'CARD' as const,
  deadline: null,
}

function renderCheckout(url = checkoutUrl(order)) {
  const router = createMemoryRouter(
    [
      { path: '/mock-pg/checkout', element: <MockCheckoutPage /> },
      { path: '/payments/success', element: <Landing /> },
      { path: '/payments/fail', element: <Landing /> },
      { path: '*', element: <Landing /> },
    ],
    { initialEntries: [url] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

function landedSearch() {
  const [path, query] = screen.getByLabelText('이동한 주소').textContent!.split('?')
  return { path, params: new URLSearchParams(query) }
}

describe('MockCheckoutPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('주문 내용을 보여 주고, 동의해야 결제할 수 있으며 승인되면 결제 키를 들고 성공 페이지로 간다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/mock-pg/checkout' && init?.method === 'POST') {
        return jsonResponse(200, { paymentKey: 'mpk_test', orderId: order.orderId, amount: order.amount })
      }
      return undefined
    })
    renderCheckout()

    expect(await screen.findByText('KIA vs LG 2매')).toBeInTheDocument()
    expect(screen.getByText('32,000원')).toBeInTheDocument()
    const pay = screen.getByRole('button', { name: '32,000원 결제하기' })
    expect(pay).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('카드사'), '현대카드')
    await userEvent.click(screen.getByLabelText('주문 내용을 확인했으며 결제 진행에 동의합니다.'))
    await userEvent.click(pay)

    await screen.findByLabelText('이동한 주소')
    const { path, params } = landedSearch()
    expect(path).toBe('/payments/success')
    expect(params.get('paymentKey')).toBe('mpk_test')
    expect(params.get('orderId')).toBe(order.orderId)
    expect(params.get('amount')).toBe('32000')

    const call = fetchMock.mock.calls.find(([input]) => String(input) === '/api/mock-pg/checkout')
    expect(JSON.parse(String((call![1] as RequestInit).body))).toMatchObject({
      orderId: order.orderId,
      amount: 32000,
      method: 'CARD',
      cardCompany: '현대카드',
      installmentMonths: 0,
      testOutcome: 'APPROVE',
    })
  })

  it('테스트 결과로 거절을 고르면 PG 사유를 들고 실패 페이지로 간다', async () => {
    restoreSessionAs(testMember(), (url) => {
      if (url === '/api/mock-pg/checkout') {
        return jsonResponse(400, { code: 'REJECT_LIMIT_EXCEEDED', message: '카드 한도가 초과되었습니다.' })
      }
      return undefined
    })
    renderCheckout()

    await userEvent.selectOptions(await screen.findByLabelText('테스트 결과'), 'REJECT_LIMIT_EXCEEDED')
    await userEvent.click(screen.getByLabelText('주문 내용을 확인했으며 결제 진행에 동의합니다.'))
    await userEvent.click(screen.getByRole('button', { name: '32,000원 결제하기' }))

    await screen.findByLabelText('이동한 주소')
    const { path, params } = landedSearch()
    expect(path).toBe('/payments/fail')
    expect(params.get('code')).toBe('REJECT_LIMIT_EXCEEDED')
    expect(params.get('message')).toBe('카드 한도가 초과되었습니다.')
    expect(params.get('orderId')).toBe(order.orderId)
  })

  it('취소를 누르면 결제 없이 실패 페이지로 간다', async () => {
    restoreSessionAs(testMember())
    renderCheckout()

    await userEvent.click(await screen.findByRole('button', { name: '취소' }))

    await screen.findByLabelText('이동한 주소')
    const { path, params } = landedSearch()
    expect(path).toBe('/payments/fail')
    expect(params.get('code')).toBe('PAY_PROCESS_CANCELED')
  })

  it('돌아갈 주소로 다른 사이트를 넣어도 우리 성공 페이지로만 보낸다', async () => {
    restoreSessionAs(testMember(), (url) =>
      url === '/api/mock-pg/checkout'
        ? jsonResponse(200, { paymentKey: 'mpk_test', orderId: order.orderId, amount: order.amount })
        : undefined,
    )
    renderCheckout(checkoutUrl(order).replace('successUrl=%2Fpayments%2Fsuccess', 'successUrl=https%3A%2F%2Fevil.example'))

    await userEvent.click(await screen.findByLabelText('주문 내용을 확인했으며 결제 진행에 동의합니다.'))
    await userEvent.click(screen.getByRole('button', { name: '32,000원 결제하기' }))

    await waitFor(() => expect(landedSearch().path).toBe('/payments/success'))
  })

  it('결제 정보가 없으면 결제창을 열지 않는다', async () => {
    restoreSessionAs(testMember())
    renderCheckout('/mock-pg/checkout?orderId=&amount=abc')

    expect(await screen.findByRole('alert')).toHaveTextContent('결제 정보가 올바르지 않습니다.')
    expect(screen.queryByRole('button', { name: /결제하기/ })).not.toBeInTheDocument()
  })
})
