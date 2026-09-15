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
  seatsPerRow: 3,
}

describe('SeatMap', () => {
  it('구역의 모든 좌석을 상태와 함께 그린다', () => {
    render(
      <SeatMap
        section={section}
        soldKeys={new Set(['5-1-1'])}
        heldKeys={new Set(['5-1-2'])}
        selectedKeys={new Set(['5-2-3'])}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: '1열 1번, 판매 완료' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1열 2번, 다른 고객 선택 중' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '2열 3번, 선택됨' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('선택 가능한 좌석을 누르면 좌석 위치를 전달한다', async () => {
    const onToggle = vi.fn()
    render(
      <SeatMap section={section} soldKeys={new Set()} heldKeys={new Set()} selectedKeys={new Set()} onToggle={onToggle} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '2열 1번, 선택 가능' }))

    expect(onToggle).toHaveBeenCalledWith({ sectionId: 5, rowNo: 2, seatNo: 1 })
  })

  it('결제 단계에서는 좌석을 바꿀 수 없다', () => {
    render(
      <SeatMap
        section={section}
        soldKeys={new Set()}
        heldKeys={new Set()}
        selectedKeys={new Set(['5-1-1'])}
        disabled
        onToggle={vi.fn()}
      />,
    )

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
