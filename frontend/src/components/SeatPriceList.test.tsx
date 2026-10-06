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
          section({ id: 3, name: '프리미엄석 1번', grade: 'PREMIUM', gradeLabel: '프리미엄석', price: 70000 }),
          section({ id: 4, name: '레드석 1번', grade: 'RED', gradeLabel: '레드석', price: 16000 }),
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

  it('구장마다 다른 좌석 이름을 쓰고, 같은 등급이라도 이름이 다르면 따로 보여준다', () => {
    render(
      <SeatPriceList
        sections={[
          section({ id: 1, name: '중앙탁자석 1번', grade: 'TABLE', gradeLabel: '테이블석', price: 45000 }),
          section({ id: 2, name: '중앙탁자석 2번', grade: 'TABLE', gradeLabel: '테이블석', price: 45000 }),
          section({ id: 3, name: '와이드탁자석 1번', grade: 'TABLE', gradeLabel: '테이블석', price: 35000 }),
          // 번호 없는 옛 구역은 등급 이름을 쓴다.
          section({ id: 4, name: '1루 내야', grade: 'INFIELD', gradeLabel: '내야석', price: 15000 }),
        ]}
      />,
    )

    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      '중앙탁자석45,000원',
      '와이드탁자석35,000원',
      '내야석15,000원',
    ])
  })
})
