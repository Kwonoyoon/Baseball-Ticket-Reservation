import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeatSection } from '../api/types'
import { hasStadiumMap, stadiumLayout } from '../lib/stadiumMap'
import { StadiumMap } from './StadiumMap'

function section(overrides: Partial<SeatSection> & Pick<SeatSection, 'id' | 'code'>): SeatSection {
  return {
    name: '네이비석 1번',
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
  section({ id: 12, code: 'RED-01', name: '레드석 1번', grade: 'RED', gradeLabel: '레드석', price: 16000 }),
]

const jamsil = stadiumLayout('JAMSIL')!

describe('StadiumMap', () => {
  it('배치도와 연결된 구장인지 판단한다', () => {
    expect(hasStadiumMap(jamsil, sections)).toBe(true)
    expect(hasStadiumMap(jamsil, [section({ id: 1, code: null })])).toBe(false)
    expect(hasStadiumMap(jamsil, [section({ id: 2, code: 'UNKNOWN-99' })])).toBe(false)
    expect(hasStadiumMap(stadiumLayout(null), sections)).toBe(false)
  })

  it('구장마다 배치도가 다르다', () => {
    const gocheok = stadiumLayout('GOCHEOK')!
    expect(gocheok.name).toBe('고척 스카이돔')
    // 잠실 블록 코드로는 고척 배치도와 이어지지 않는다.
    expect(hasStadiumMap(gocheok, sections)).toBe(false)
    expect(hasStadiumMap(gocheok, [section({ id: 3, code: 'DIAMOND-01' })])).toBe(true)
    expect(stadiumLayout('NOWHERE')).toBeNull()
  })

  it('블록을 잔여석과 함께 보여주고, 누르면 구역 ID를 전달한다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumMap
        layout={jamsil}
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

    const navy = screen.getByRole('button', { name: '네이비석 1번 12,000원 잔여 150석' })
    expect(navy).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: '레드석 1번 16,000원 잔여 4석' }))
    expect(onSelect).toHaveBeenCalledWith(12)
  })

  it('고른 구역만 또렷하게 두고 나머지는 흐리게 표시한다', () => {
    render(
      <StadiumMap
        layout={jamsil}
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

    const active = screen.getByRole('button', { name: /네이비석 1번/ }).closest('g')
    const other = screen.getByRole('button', { name: /레드석 1번/ }).closest('g')

    expect(active).toHaveClass('is-active')
    expect(active).not.toHaveClass('is-dimmed')
    expect(other).toHaveClass('is-dimmed')
  })

  it('블록이 아닌 곳을 누르면 선택을 푼다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumMap
        layout={jamsil}
        sections={sections}
        activeSectionId={11}
        remainingBySection={new Map([[11, 150]])}
        selectedBySection={new Map()}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByRole('group', { name: '좌석 배치도' }))

    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('매진된 블록은 선택할 수 없다', async () => {
    const onSelect = vi.fn()
    render(
      <StadiumMap
        layout={jamsil}
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

    const soldOut = screen.getByRole('button', { name: '네이비석 1번 12,000원 매진' })
    expect(soldOut).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(soldOut)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('커서를 올리면 블록 이름과 잔여석을 보여준다', async () => {
    render(
      <StadiumMap
        layout={jamsil}
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

    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await userEvent.hover(screen.getByRole('button', { name: /레드석 1번/ }))

    const tooltip = screen.getByRole('status')
    expect(tooltip).toHaveTextContent('레드석 1번')
    expect(tooltip).toHaveTextContent('16,000원')
    expect(tooltip).toHaveTextContent('잔여 4석')

    await userEvent.unhover(screen.getByRole('button', { name: /레드석 1번/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
