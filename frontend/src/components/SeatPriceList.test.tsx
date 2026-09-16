import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SeatSection } from '../api/types'
import { SeatPriceList } from './SeatPriceList'

function section(overrides: Partial<SeatSection> & Pick<SeatSection, 'id'>): SeatSection {
  return {
    code: null,
    name: '네이비석 1번',
    grade: 'NAVY',
    gradeLabel: '네이비석',
    price: 12000,
    seatRows: 10,
    seatsPerRow: 22,
    ...overrides,
  }
}

describe('SeatPriceList', () => {
  it('등급별 가격을 비싼 순으로 한 줄씩 보여준다', () => {
    render(
      <SeatPriceList
        sections={[
          section({ id: 1 }),
          section({ id: 2, name: '네이비석 2번' }),
          section({ id: 3, grade: 'PREMIUM', gradeLabel: '프리미엄석', price: 70000 }),
          section({ id: 4, grade: 'RED', gradeLabel: '레드석', price: 16000 }),
        ]}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    // 같은 등급의 블록은 한 줄로 묶는다.
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.textContent)).toEqual([
      '프리미엄석70,000원',
      '레드석16,000원',
      '네이비석12,000원',
    ])
  })
})
