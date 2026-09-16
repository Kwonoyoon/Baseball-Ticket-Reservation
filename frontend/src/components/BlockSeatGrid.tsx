import type { ReservedSeat } from '../api/types'
import { seatKey } from '../lib/format'

type BlockSeatGridProps = {
  /** 같은 블록에 예매한 좌석들 */
  seats: ReservedSeat[]
  /** 그중 지금 짚어 줄 좌석 */
  selected: ReservedSeat
  /** 좌석표에서 내 좌석을 누르면 왼쪽 목록의 선택도 함께 바뀐다. */
  onSelect: (seat: ReservedSeat) => void
}

/** 블록 안에서 내 좌석이 몇 열 몇 번째인지 보여준다. 예매 화면의 좌석표와 같은 모양이다. */
export function BlockSeatGrid({ seats, selected, onSelect }: BlockSeatGridProps) {
  const mine = new Map(seats.map((seat) => [seatKey(seat), seat]))
  const rows = Array.from({ length: selected.seatRows }, (_, index) => index + 1)
  const seatNumbers = Array.from({ length: selected.seatsPerRow }, (_, index) => index + 1)
  const mineLabel = seats.map((seat) => `${seat.rowNo}열 ${seat.seatNo}번`).join(', ')

  return (
    <div className={`seat-map block-grid grade--${selected.grade.toLowerCase()}`}>
      <div className="seat-map__ground">그라운드 방향</div>
      <div className="seat-map__scroll">
        <div
          className="seat-map__grid"
          role="group"
          aria-label={`${selected.sectionName} ${selected.seatRows}열 ${selected.seatsPerRow}석 중 내 좌석 ${mineLabel}`}
        >
          {rows.map((rowNo) => (
            <div className="seat-row" key={rowNo}>
              <span className="seat-row__label" aria-hidden="true">
                {rowNo}열
              </span>
              {seatNumbers.map((seatNo) => {
                const mineSeat = mine.get(seatKey({ sectionId: selected.sectionId, rowNo, seatNo }))
                const isFocus = rowNo === selected.rowNo && seatNo === selected.seatNo
                const classes = ['seat', mineSeat ? 'seat--mine' : 'seat--other', isFocus ? 'is-focus' : '']
                  .filter(Boolean)
                  .join(' ')

                // 내가 예매한 좌석만 누를 수 있다. 나머지는 자리를 보여 주기만 한다.
                if (!mineSeat) {
                  return (
                    <span className={classes} key={seatNo} aria-hidden="true">
                      {seatNo}
                    </span>
                  )
                }
                return (
                  <button
                    type="button"
                    className={classes}
                    key={seatNo}
                    aria-pressed={isFocus}
                    aria-label={`${selected.sectionName} ${rowNo}열 ${seatNo}번`}
                    onClick={() => onSelect(mineSeat)}
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
