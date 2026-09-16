import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ReservedSeat } from '../api/types'
import { ReservedSeatMap } from './ReservedSeatMap'

function seat(overrides: Partial<ReservedSeat> = {}): ReservedSeat {
  return {
    sectionId: 11,
    sectionCode: 'NAVY-01',
    sectionName: '네이비석 1번',
    grade: 'NAVY',
    rowNo: 3,
    seatNo: 7,
    seatRows: 10,
    seatsPerRow: 22,
    price: 12000,
    ...overrides,
  }
}

describe('ReservedSeatMap', () => {
  it('예매한 블록만 강조하고 좌석을 적는다', () => {
    render(<ReservedSeatMap seats={[seat(), seat({ seatNo: 8 })]} />)

    expect(screen.getByRole('img', { name: '내 좌석 위치: 네이비석 1번 3열 7번, 3열 8번' })).toBeInTheDocument()

    // 블록 하나에 좌석이 한 줄씩 쌓인다.
    expect(screen.getByText('네이비석 1번')).toBeInTheDocument()
    expect(screen.getByText('3열 7번')).toBeInTheDocument()
    expect(screen.getByText('3열 8번')).toBeInTheDocument()
  })

  it('블록이 여러 개면 모두 보여준다', () => {
    const { container } = render(
      <ReservedSeatMap
        seats={[
          seat(),
          seat({ sectionId: 12, sectionCode: 'RED-02', sectionName: '레드석 2번', grade: 'RED', rowNo: 1, seatNo: 2 }),
        ]}
      />,
    )

    const groups = [...container.querySelectorAll('.seat-location__list > li')]
    expect(groups.map((group) => group.textContent)).toEqual(['네이비석 1번3열 7번', '레드석 2번1열 2번'])
  })

  it('좌석을 누르면 블록 안 어디에 앉는지 펼친다', async () => {
    const user = userEvent.setup()
    render(<ReservedSeatMap seats={[seat(), seat({ seatNo: 8 })]} />)

    await user.click(screen.getByRole('button', { name: '3열 8번' }))

    // 10열 22석 블록의 좌석표에서 내 좌석을 짚어 준다.
    expect(
      screen.getByRole('group', { name: '네이비석 1번 10열 22석 중 내 좌석 3열 7번, 3열 8번' }),
    ).toBeInTheDocument()
  })

  it('배치도에서 블록을 눌러도 좌석표가 열린다', async () => {
    const user = userEvent.setup()
    render(<ReservedSeatMap seats={[seat()]} />)

    await user.click(screen.getByRole('button', { name: '네이비석 1번 좌석표 보기' }))

    expect(screen.getByRole('group', { name: /네이비석 1번 10열 22석 중 내 좌석/ })).toBeInTheDocument()
  })

  it('좌석표에서 좌석을 누르면 왼쪽 목록의 선택도 따라온다', async () => {
    const user = userEvent.setup()
    render(<ReservedSeatMap seats={[seat(), seat({ seatNo: 8 })]} />)

    // 목록에서 3열 7번을 고르면 좌석표가 열린다.
    await user.click(screen.getByRole('button', { name: '3열 7번' }))
    expect(screen.getByRole('button', { name: '3열 7번' })).toHaveAttribute('aria-expanded', 'true')

    // 좌석표에서 3열 8번을 누르면 목록 쪽 선택이 그 좌석으로 넘어간다.
    await user.click(screen.getByRole('button', { name: '네이비석 1번 3열 8번' }))

    expect(screen.getByRole('button', { name: '3열 8번', expanded: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3열 7번', expanded: false })).toBeInTheDocument()
  })

  it('같은 좌석을 다시 누르면 접힌다', async () => {
    const user = userEvent.setup()
    const { container } = render(<ReservedSeatMap seats={[seat()]} />)

    await user.click(screen.getByRole('button', { name: '3열 7번' }))
    expect(container.querySelector('.block-grid')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '3열 7번' }))
    expect(container.querySelector('.block-grid')).toBeNull()
  })

  it('배치도에 없는 구역이면 아무것도 그리지 않는다', () => {
    const { container } = render(<ReservedSeatMap seats={[seat({ sectionCode: null })]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
