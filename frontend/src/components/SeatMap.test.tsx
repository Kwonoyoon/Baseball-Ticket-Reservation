import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeatSection } from '../api/types'
import { SeatMap } from './SeatMap'

const section: SeatSection = {
  id: 5,
  name: '1루 테이블석',
  grade: 'TABLE',
  gradeLabel: '테이블석',
  price: 45000,
  seatRows: 2,
  seatsPerRow: 6,
}

function renderSeatMap(overrides: Partial<React.ComponentProps<typeof SeatMap>> = {}) {
  const props = {
    section,
    soldKeys: new Set<string>(),
    heldKeys: new Set<string>(),
    selectedKeys: new Set<string>(),
    quantity: 1,
    onSelectGroup: vi.fn(),
    onClearSelection: vi.fn(),
    onGroupUnavailable: vi.fn(),
    ...overrides,
  }
  render(<SeatMap {...props} />)
  return props
}

describe('SeatMap', () => {
  it('구역의 모든 좌석을 상태와 함께 그린다', () => {
    renderSeatMap({
      soldKeys: new Set(['5-1-1']),
      heldKeys: new Set(['5-1-2']),
      selectedKeys: new Set(['5-2-3']),
    })

    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect(screen.getByRole('button', { name: '1열 1번, 판매 완료' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1열 2번, 다른 고객 선택 중' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '2열 3번, 선택됨' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('매수만큼 연속된 좌석을 한 번에 선택한다', async () => {
    const { onSelectGroup } = renderSeatMap({ quantity: 3 })

    await userEvent.click(screen.getByRole('button', { name: '2열 2번, 선택 가능' }))

    expect(onSelectGroup).toHaveBeenCalledWith([
      { sectionId: 5, rowNo: 2, seatNo: 2 },
      { sectionId: 5, rowNo: 2, seatNo: 3 },
      { sectionId: 5, rowNo: 2, seatNo: 4 },
    ])
  })

  it('커서를 올리면 선택될 연속 좌석을 미리 보여준다', async () => {
    renderSeatMap({ quantity: 2 })

    await userEvent.hover(screen.getByRole('button', { name: '1열 3번, 선택 가능' }))

    expect(screen.getByRole('button', { name: '1열 3번, 선택 가능' })).toHaveClass('seat--preview')
    expect(screen.getByRole('button', { name: '1열 4번, 선택 가능' })).toHaveClass('seat--preview')
    expect(screen.getByRole('button', { name: '1열 5번, 선택 가능' })).not.toHaveClass('seat--preview')

    await userEvent.unhover(screen.getByRole('button', { name: '1열 3번, 선택 가능' }))
    expect(screen.getByRole('button', { name: '1열 3번, 선택 가능' })).not.toHaveClass('seat--preview')
  })

  it('연속 좌석을 만들 수 없으면 알려준다', async () => {
    // 1열: 1번 판매, 4번 판매 → 3번을 포함한 연속 3석을 만들 수 없다.
    const { onSelectGroup, onGroupUnavailable } = renderSeatMap({
      quantity: 3,
      soldKeys: new Set(['5-1-1', '5-1-4']),
    })

    await userEvent.click(screen.getByRole('button', { name: '1열 3번, 선택 가능' }))

    expect(onGroupUnavailable).toHaveBeenCalled()
    expect(onSelectGroup).not.toHaveBeenCalled()
  })

  it('이미 선택한 좌석을 누르면 선택을 해제한다', async () => {
    const { onClearSelection } = renderSeatMap({ quantity: 2, selectedKeys: new Set(['5-1-1', '5-1-2']) })

    await userEvent.click(screen.getByRole('button', { name: '1열 1번, 선택됨' }))

    expect(onClearSelection).toHaveBeenCalled()
  })

  it('결제 단계에서는 좌석을 바꿀 수 없다', () => {
    renderSeatMap({ selectedKeys: new Set(['5-1-1']), disabled: true })

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
