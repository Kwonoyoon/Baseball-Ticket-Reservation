import { render, screen } from '@testing-library/react'
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

  it('배치도에 없는 구역이면 아무것도 그리지 않는다', () => {
    const { container } = render(<ReservedSeatMap seats={[seat({ sectionCode: null })]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
