import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeatSection } from '../api/types'
import { StadiumOverview } from './StadiumOverview'

const sections: SeatSection[] = [
  {
    id: 1,
    code: null,
    name: '1루 내야석',
    grade: 'INFIELD',
    gradeLabel: '내야석',
    price: 20000,
    seatRows: 8,
    seatsPerRow: 16,
  },
  {
    id: 2,
    code: null,
    name: '외야 자유석',
    grade: 'OUTFIELD',
    gradeLabel: '외야석',
    price: 10000,
    seatRows: 8,
    seatsPerRow: 20,
  },
]

describe('StadiumOverview', () => {
  it('구역별 잔여석과 매진 여부를 보여준다', () => {
    render(
      <StadiumOverview
        sections={sections}
        activeSectionId={1}
        remainingBySection={new Map([
          [1, 1234],
          [2, 0],
        ])}
        selectedBySection={new Map([[1, 2]])}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('20,000원 · 잔여 1,234석')).toBeInTheDocument()
    expect(screen.getByText('10,000원 · 매진')).toBeInTheDocument()
    expect(screen.getByLabelText('2석 선택됨')).toBeInTheDocument()
  })

  it('잔여석을 아직 못 받았으면 확인 중으로 표시한다', () => {
    render(
      <StadiumOverview
        sections={sections}
        activeSectionId={null}
        remainingBySection={new Map()}
        selectedBySection={new Map()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getAllByText(/잔여석 확인 중/)).toHaveLength(2)
  })

  it('구역을 누르면 해당 구역 ID를 전달하고, 매진 구역은 누를 수 없다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumOverview
        sections={sections}
        activeSectionId={1}
        remainingBySection={new Map([
          [1, 10],
          [2, 0],
        ])}
        selectedBySection={new Map()}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /1루 내야석/ }))
    expect(onSelect).toHaveBeenCalledWith(1)

    expect(screen.getByRole('button', { name: /외야 자유석/ })).toBeDisabled()
  })
})
