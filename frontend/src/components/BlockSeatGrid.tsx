import type { ReservedSeat } from '../api/types'
import { seatKey } from '../lib/format'

type BlockSeatGridProps = {
  /** 같은 블록에 예매한 좌석들 */
  seats: ReservedSeat[]
  /** 그중 지금 짚어 줄 좌석 */
  selected: ReservedSeat
}

/** 블록 안에서 내 좌석이 몇 열 몇 번째인지 보여준다. 예매 화면의 좌석표와 같은 모양이다. */
export function BlockSeatGrid({ seats, selected }: BlockSeatGridProps) {
  const mine = new Set(seats.map(seatKey))
  const rows = Array.from({ length: selected.seatRows }, (_, index) => index + 1)
  const seatNumbers = Array.from({ length: selected.seatsPerRow }, (_, index) => index + 1)
  const mineLabel = seats.map((seat) => `${seat.rowNo}열 ${seat.seatNo}번`).join(', ')

  return (
    <div className={`seat-map block-grid grade--${selected.grade.toLowerCase()}`}>
      <div className="seat-map__ground">그라운드 방향</div>
      <div className="seat-map__scroll">
        <div
          className="seat-map__grid"
          role="img"
          aria-label={`${selected.sectionName} ${selected.seatRows}열 ${selected.seatsPerRow}석 중 내 좌석 ${mineLabel}`}
        >
          {rows.map((rowNo) => (
            <div className="seat-row" key={rowNo}>
              <span className="seat-row__label" aria-hidden="true">
                {rowNo}열
              </span>
              {seatNumbers.map((seatNo) => {
                const isMine = mine.has(seatKey({ sectionId: selected.sectionId, rowNo, seatNo }))
                const isFocus = rowNo === selected.rowNo && seatNo === selected.seatNo
                const classes = ['seat', isMine ? 'seat--mine' : 'seat--other', isFocus ? 'is-focus' : '']
                  .filter(Boolean)
                  .join(' ')
                return (
                  <span className={classes} key={seatNo} aria-hidden="true">
                    {seatNo}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
