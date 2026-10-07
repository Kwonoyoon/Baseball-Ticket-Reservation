import { useEffect, useRef, useState } from 'react'
import type { ReservedSeat } from '../api/types'
import { seatKey } from '../lib/format'
import { scrollPanelIntoView } from '../lib/panelScroll'
import { stadiumLayout } from '../lib/stadiumMap'
import { STADIUM_VIEW_BOX } from '../lib/stadiumMaps'
import { BlockSeatGrid } from './BlockSeatGrid'
import { StadiumGround } from './StadiumGround'

type ReservedSeatMapProps = {
  seats: ReservedSeat[]
  /** 예매한 경기의 구장 코드. 구장마다 배치도가 다르다. */
  stadiumCode: string | null
  /**
   * 블록 안 좌석표를 펼친 좌석. 주면 바깥(QR 티켓의 좌석 목록 등)에서 고른 좌석과 함께 움직인다.
   * 주지 않으면 이 컴포넌트가 스스로 정한다.
   */
  openSeat?: ReservedSeat | null
  onOpenSeatChange?: (seat: ReservedSeat | null) => void
  /** 왼쪽 좌석 목록을 그릴지. 바깥에서 좌석 목록을 따로 보여 줄 때 끈다. */
  showList?: boolean
}

/** 예매한 좌석이 구장 어디인지 보여준다. 고르는 화면이 아니라 읽기 전용이다. */
export function ReservedSeatMap({
  seats,
  stadiumCode,
  openSeat: controlledOpenSeat,
  onOpenSeatChange,
  showList = true,
}: ReservedSeatMapProps) {
  // 좌석을 누르면 블록 안 어디에 앉는지 아래에 펼친다.
  const [ownOpenSeat, setOwnOpenSeat] = useState<ReservedSeat | null>(null)
  const openSeat = controlledOpenSeat === undefined ? ownOpenSeat : controlledOpenSeat
  const setOpenSeat = (seat: ReservedSeat | null) => {
    if (controlledOpenSeat === undefined) setOwnOpenSeat(seat)
    onOpenSeatChange?.(seat)
  }
  const gridRef = useRef<HTMLElement>(null)

  // 좌석표가 배치도 아래에 있어 그냥 열면 화면 밖이다. 열릴 때 그쪽으로 내려간다.
  // 같은 블록 안에서 좌석만 바꿀 때는 이미 보고 있으므로 움직이지 않는다.
  const openCode = openSeat?.sectionCode ?? null
  useEffect(() => {
    if (openCode === null) return
    return scrollPanelIntoView(gridRef.current)
  }, [openCode])

  // 한 예매에 여러 블록이 섞일 수 있으므로 블록별로 묶는다.
  const seatsByCode = new Map<string, ReservedSeat[]>()
  for (const seat of seats) {
    if (seat.sectionCode === null) continue
    const group = seatsByCode.get(seat.sectionCode)
    if (group) group.push(seat)
    else seatsByCode.set(seat.sectionCode, [seat])
  }

  const layout = stadiumLayout(stadiumCode)
  const mine = layout?.blocks.filter((block) => seatsByCode.has(block.code)) ?? []
  // 배치도가 없는 구장이거나, 지금 배치도에 없는 블록으로 예매한 경우(구장 배치도가 바뀌기 전 예매)는 그리지 않는다.
  if (!layout || mine.length === 0) return null

  const label = mine
    .map((block) => {
      const group = seatsByCode.get(block.code) ?? []
      return `${group[0].sectionName} ${group.map((seat) => `${seat.rowNo}열 ${seat.seatNo}번`).join(', ')}`
    })
    .join(' / ')

  return (
    <div className={`seat-location${showList ? '' : ' seat-location--map-only'}`}>
      {showList && (
        <ul className="seat-location__list">
          {mine.map((block) => {
            const group = seatsByCode.get(block.code) ?? []
            return (
              <li key={block.code} className={`grade--${block.grade.toLowerCase()}`}>
                <p className="seat-location__name">
                  <span className="seat-location__chip" aria-hidden="true" />
                  <strong>{group[0].sectionName}</strong>
                </p>
                <ul className="seat-location__seats">
                  {group.map((seat) => {
                    const isOpen = openSeat !== null && seatKey(openSeat) === seatKey(seat)
                    return (
                      <li key={`${seat.rowNo}-${seat.seatNo}`}>
                        <button
                          type="button"
                          className={`seat-location__seat${isOpen ? " is-open" : ""}`}
                          aria-expanded={isOpen}
                          aria-controls="reserved-seat-grid"
                          onClick={() => setOpenSeat(isOpen ? null : seat)}
                        >
                          {seat.rowNo}열 {seat.seatNo}번
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}

      <svg viewBox={STADIUM_VIEW_BOX} role="img" aria-label={`내 좌석 위치: ${label}`}>
        <StadiumGround layout={layout} fieldClassName="seat-location__field" />

        {layout.blocks.map((block) => {
          const group = seatsByCode.get(block.code)
          const isMine = group !== undefined
          const isOpen = isMine && openSeat?.sectionCode === block.code
          // 내 블록을 누르면 그 블록의 좌석표를 펼친다.
          const toggle = () => {
            if (!group) return
            setOpenSeat(isOpen ? null : group[0])
          }
          return (
            <g
              key={block.code}
              className={`seat-location__block grade--${block.grade.toLowerCase()}${isMine ? ' is-mine' : ''}${
                isOpen ? ' is-open' : ''
              }`}
            >
              <path
                d={block.d}
                role={isMine ? 'button' : undefined}
                tabIndex={isMine ? 0 : undefined}
                aria-expanded={isMine ? isOpen : undefined}
                aria-label={isMine ? `${group[0].sectionName} 좌석표 보기` : undefined}
                onClick={toggle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggle()
                  }
                }}
              />
              {isMine && (
                <text
                  className="seat-location__number"
                  x={block.labelX}
                  y={block.labelY}
                  transform={`rotate(${block.labelRotate} ${block.labelX} ${block.labelY})`}
                >
                  {block.number}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {openSeat && (
        <section
          id="reserved-seat-grid"
          className="seat-location__grid"
          ref={gridRef}
          aria-label="블록 안 좌석 위치"
        >
          <BlockSeatGrid
            seats={seatsByCode.get(openSeat.sectionCode ?? '') ?? []}
            selected={openSeat}
            onSelect={setOpenSeat}
          />
        </section>
      )}
    </div>
  )
}
