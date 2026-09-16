import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeatSection } from '../api/types'
import { hasStadiumMap } from '../lib/stadiumMap'
import { StadiumMap } from './StadiumMap'

function section(overrides: Partial<SeatSection> & Pick<SeatSection, 'id' | 'code'>): SeatSection {
  return {
    name: '네이비석 1블록',
    grade: 'NAVY',
    gradeLabel: '네이비석',
    price: 12000,
    seatRows: 10,
    seatsPerRow: 22,
    ...overrides,
  }
}

const sections: SeatSection[] = [
  section({ id: 11, code: 'NAVY-01' }),
  section({ id: 12, code: 'RED-01', name: '레드석 1블록', grade: 'RED', gradeLabel: '레드석', price: 16000 }),
]

describe('StadiumMap', () => {
  it('배치도와 연결된 구장인지 판단한다', () => {
    expect(hasStadiumMap(sections)).toBe(true)
    expect(hasStadiumMap([section({ id: 1, code: null })])).toBe(false)
    expect(hasStadiumMap([section({ id: 2, code: 'UNKNOWN-99' })])).toBe(false)
  })

  it('블록을 잔여석과 함께 보여주고, 누르면 구역 ID를 전달한다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumMap
        sections={sections}
        activeSectionId={11}
        remainingBySection={new Map([
          [11, 150],
          [12, 4],
        ])}
        selectedBySection={new Map()}
        onSelect={onSelect}
      />,
    )

    const navy = screen.getByRole('button', { name: '네이비석 1블록 12,000원 잔여 150석' })
    expect(navy).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: '레드석 1블록 16,000원 잔여 4석' }))
    expect(onSelect).toHaveBeenCalledWith(12)
  })

  it('고른 구역만 또렷하게 두고 나머지는 흐리게 표시한다', () => {
    render(
      <StadiumMap
        sections={sections}
        activeSectionId={11}
        remainingBySection={new Map([
          [11, 150],
          [12, 4],
        ])}
        selectedBySection={new Map()}
        onSelect={vi.fn()}
      />,
    )

    const active = screen.getByRole('button', { name: /네이비석 1블록/ }).closest('g')
    const other = screen.getByRole('button', { name: /레드석 1블록/ }).closest('g')

    expect(active).toHaveClass('is-active')
    expect(active).not.toHaveClass('is-dimmed')
    expect(other).toHaveClass('is-dimmed')
  })

  it('매진된 블록은 선택할 수 없다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumMap
        sections={sections}
        activeSectionId={null}
        remainingBySection={new Map([
          [11, 0],
          [12, 10],
        ])}
        selectedBySection={new Map()}
        onSelect={onSelect}
      />,
    )

    const soldOut = screen.getByRole('button', { name: '네이비석 1블록 12,000원 매진' })
    expect(soldOut).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(soldOut)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('등급별 범례를 보여준다', () => {
    render(
      <StadiumMap
        sections={sections}
        activeSectionId={null}
        remainingBySection={new Map([
          [11, 150],
          [12, 4],
        ])}
        selectedBySection={new Map()}
        onSelect={vi.fn()}
      />,
    )

    const legend = screen.getByRole('list', { name: '좌석 등급' })
    expect(legend).toHaveTextContent('네이비석')
    expect(legend).toHaveTextContent('12,000원')
    expect(legend).toHaveTextContent('잔여 150석')
  })
})
