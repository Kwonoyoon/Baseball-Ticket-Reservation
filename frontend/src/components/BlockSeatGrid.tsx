import type { ReservedSeat } from '../api/types'
import { seatKey } from '../lib/format'

type BlockSeatGridProps = {
  /** 같은 블록에 예매한 좌석들 */
  seats: ReservedSeat[]
  /** 그중 지금 고른 좌석 */
  selected: ReservedSeat
}

/** 블록 안에서 내 좌석이 몇 열 몇 번째인지 보여준다. 읽기 전용이다. */
export function BlockSeatGrid({ seats, selected }: BlockSeatGridProps) {
  const mine = new Set(seats.map(seatKey))
  const rows = Array.from({ length: selected.seatRows }, (_, index) => index + 1)
  const seatNumbers = Array.from({ length: selected.seatsPerRow }, (_, index) => index + 1)

  return (
    <div className={`block-grid grade--${selected.grade.toLowerCase()}`}>
      <p className="block-grid__ground" aria-hidden="true">
        그라운드 방향
      </p>
      <div className="block-grid__scroll">
        <div
          className="block-grid__rows"
          role="img"
          aria-label={`${selected.sectionName} ${selected.seatRows}열 ${selected.seatsPerRow}석 중 ${selected.rowNo}열 ${selected.seatNo}번`}
        >
          {rows.map((rowNo) => (
            <div className="block-grid__row" key={rowNo}>
              <span className="block-grid__label">{rowNo}열</span>
              {seatNumbers.map((seatNo) => {
                const key = seatKey({ sectionId: selected.sectionId, rowNo, seatNo })
                const isSelected = rowNo === selected.rowNo && seatNo === selected.seatNo
                const classes = [
                  'block-grid__seat',
                  mine.has(key) ? 'is-mine' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return <span className={classes} key={seatNo} />
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="block-grid__caption">
        <strong>
          {selected.rowNo}열 {selected.seatNo}번
        </strong>
        <span>
          {selected.sectionName} · {selected.seatRows}열 {selected.seatsPerRow}석
        </span>
      </p>
    </div>
  )
}
