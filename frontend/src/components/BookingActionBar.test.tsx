import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BookingActionBar } from './BookingActionBar'

describe('BookingActionBar', () => {
  it('고른 좌석이 없으면 아무것도 보여주지 않는다', () => {
    const { container } = render(
      <BookingActionBar seatCount={0} totalPrice={0} isAuthenticated submitting={false} onSubmit={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('선택한 좌석 수와 금액을 보여주고 결제를 시작한다', async () => {
    const onSubmit = vi.fn()
    render(
      <BookingActionBar
        seatCount={2}
        totalPrice={24000}
        isAuthenticated
        submitting={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('2석 선택')).toBeInTheDocument()
    expect(screen.getByText('24,000원')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '선택 완료 · 결제하기' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('로그인하지 않았으면 로그인 안내를 버튼에 적는다', () => {
    render(
      <BookingActionBar
        seatCount={1}
        totalPrice={12000}
        isAuthenticated={false}
        submitting={false}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: '로그인하고 예매하기' })).toBeInTheDocument()
  })
})
