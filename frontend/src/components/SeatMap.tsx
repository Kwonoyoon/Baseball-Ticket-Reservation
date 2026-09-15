import type { SeatPosition, SeatSection } from '../api/types'
import { seatKey } from '../lib/format'

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
  /** 결제 단계처럼 좌석을 바꿀 수 없을 때 */
  disabled?: boolean
  onToggle: (seat: SeatPosition) => void
}

export function SeatMap({ section, soldKeys, heldKeys, selectedKeys, disabled = false, onToggle }: SeatMapProps) {
  const rows = Array.from({ length: section.seatRows }, (_, index) => index + 1)
  const seatNumbers = Array.from({ length: section.seatsPerRow }, (_, index) => index + 1)

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
                return (
                  <button
                    key={key}
                    type="button"
                    className={`seat seat--${state}`}
                    disabled={disabled || state === 'sold' || state === 'held'}
                    aria-pressed={state === 'selected'}
                    aria-label={`${rowNo}열 ${seatNo}번, ${STATE_LABELS[state]}`}
                    title={`${rowNo}열 ${seatNo}번`}
                    onClick={() => onToggle(seat)}
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
