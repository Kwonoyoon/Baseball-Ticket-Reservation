import { useMemo, useState } from 'react'
import type { SeatPosition, SeatSection } from '../api/types'
import { seatKey } from '../lib/format'
import { findAdjacentGroup } from '../lib/seatGroup'

type SeatState = 'available' | 'selected' | 'held' | 'sold'

const STATE_LABELS: Record<SeatState, string> = {
  available: '선택 가능',
  selected: '선택됨',
  held: '다른 고객 선택 중',
  sold: '판매 완료',
}

type SeatMapProps = {
  section: SeatSection
  soldKeys: ReadonlySet<string>
  heldKeys: ReadonlySet<string>
  selectedKeys: ReadonlySet<string>
  /** 한 번에 고를 매수. 좌석에 커서를 올리면 이 수만큼 연속 좌석을 미리 보여준다. */
  quantity: number
  /** 결제 단계처럼 좌석을 바꿀 수 없을 때 */
  disabled?: boolean
  onSelectGroup: (seats: SeatPosition[]) => void
  onClearSelection: () => void
  /** 연속 좌석을 찾지 못했을 때 (안내 문구용) */
  onGroupUnavailable?: () => void
}

export function SeatMap({
  section,
  soldKeys,
  heldKeys,
  selectedKeys,
  quantity,
  disabled = false,
  onSelectGroup,
  onClearSelection,
  onGroupUnavailable,
}: SeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<{ rowNo: number; seatNo: number } | null>(null)

  const rows = Array.from({ length: section.seatRows }, (_, index) => index + 1)
  const seatNumbers = Array.from({ length: section.seatsPerRow }, (_, index) => index + 1)

  /** 내가 이미 고른 좌석은 다시 묶을 수 있으므로 선택 가능으로 본다. */
  const canTake = useMemo(
    () => (rowNo: number, seatNo: number) => {
      const key = seatKey({ sectionId: section.id, rowNo, seatNo })
      return !soldKeys.has(key) && !heldKeys.has(key)
    },
    [section.id, soldKeys, heldKeys],
  )

  const groupAt = (rowNo: number, seatNo: number) =>
    findAdjacentGroup(section.seatsPerRow, seatNo, quantity, (candidate) => canTake(rowNo, candidate))

  const previewKeys = useMemo(() => {
    if (!hoveredSeat || disabled) return new Set<string>()
    const group = findAdjacentGroup(section.seatsPerRow, hoveredSeat.seatNo, quantity, (candidate) =>
      canTake(hoveredSeat.rowNo, candidate),
    )
    return new Set(
      (group ?? []).map((seatNo) => seatKey({ sectionId: section.id, rowNo: hoveredSeat.rowNo, seatNo })),
    )
  }, [hoveredSeat, disabled, quantity, section.id, section.seatsPerRow, canTake])

  const handleClick = (rowNo: number, seatNo: number) => {
    if (selectedKeys.has(seatKey({ sectionId: section.id, rowNo, seatNo }))) {
      onClearSelection()
      return
    }
    const group = groupAt(rowNo, seatNo)
    if (group === null) {
      onGroupUnavailable?.()
      return
    }
    onSelectGroup(group.map((number) => ({ sectionId: section.id, rowNo, seatNo: number })))
  }

  return (
    <div className={`seat-map grade--${section.grade.toLowerCase()}`}>
      <div className="seat-map__ground">그라운드 방향</div>
      <div className="seat-map__scroll">
        <div className="seat-map__grid" role="group" aria-label={`${section.name} 좌석 배치도`}>
          {rows.map((rowNo) => (
            <div className="seat-row" key={rowNo}>
              <span className="seat-row__label" aria-hidden="true">
                {rowNo}열
              </span>
              {seatNumbers.map((seatNo) => {
                const seat = { sectionId: section.id, rowNo, seatNo }
                const key = seatKey(seat)
                const state: SeatState = soldKeys.has(key)
                  ? 'sold'
                  : heldKeys.has(key)
                    ? 'held'
                    : selectedKeys.has(key)
                      ? 'selected'
                      : 'available'
                const preview = previewKeys.has(key) && state !== 'selected'
                return (
                  <button
                    key={key}
                    type="button"
                    className={`seat seat--${state}${preview ? ' seat--preview' : ''}`}
                    disabled={disabled || state === 'sold' || state === 'held'}
                    aria-pressed={state === 'selected'}
                    aria-label={`${rowNo}열 ${seatNo}번, ${STATE_LABELS[state]}`}
                    title={`${rowNo}열 ${seatNo}번`}
                    onMouseEnter={() => setHoveredSeat({ rowNo, seatNo })}
                    onMouseLeave={() => setHoveredSeat(null)}
                    onFocus={() => setHoveredSeat({ rowNo, seatNo })}
                    onBlur={() => setHoveredSeat(null)}
                    onClick={() => handleClick(rowNo, seatNo)}
                  >
                    <span aria-hidden="true">{seatNo}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SeatLegend() {
  return (
    <ul className="legend" aria-label="좌석 상태 안내">
      {(Object.keys(STATE_LABELS) as SeatState[]).map((state) => (
        <li key={state}>
          <span className={`seat seat--${state} seat--legend`} aria-hidden="true" />
          {STATE_LABELS[state]}
        </li>
      ))}
    </ul>
  )
}
