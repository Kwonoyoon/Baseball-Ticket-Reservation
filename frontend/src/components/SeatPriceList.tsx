import type { SeatSection } from '../api/types'
import { formatPrice } from '../lib/format'

type SeatPriceListProps = {
  sections: SeatSection[]
}

/**
 * 좌석 종류 이름. 구장마다 같은 등급이라도 부르는 이름이 달라(고척 "다이아몬드석", 사직 "중앙탁자석" 등)
 * 구역 이름("다이아몬드석 2번")에서 번호를 떼어 쓴다. 번호가 없는 구역은 등급 이름을 쓴다.
 */
function seatClassName(section: SeatSection): string {
  const match = /^(.*\S)\s+\d+번$/.exec(section.name)
  return match ? match[1] : section.gradeLabel
}

/** 좌석 종류별 가격. 블록이 많아 종류 단위로 묶어 비싼 순으로 보여준다. 색은 등급을 따른다. */
export function SeatPriceList({ sections }: SeatPriceListProps) {
  const classes = new Map<string, { grade: string; label: string; price: number }>()
  for (const section of sections) {
    const label = seatClassName(section)
    const current = classes.get(label)
    classes.set(label, {
      grade: section.grade,
      label,
      price: Math.min(current?.price ?? section.price, section.price),
    })
  }
  const prices = [...classes.values()].sort((a, b) => b.price - a.price)

  return (
    <ul className="seat-price-list" aria-label="좌석 등급별 가격">
      {prices.map((item) => (
        <li key={item.label} className={`grade--${item.grade.toLowerCase()}`}>
          <span className="seat-price-list__chip" aria-hidden="true" />
          <span className="seat-price-list__label">{item.label}</span>
          <strong className="seat-price-list__price">{formatPrice(item.price)}</strong>
        </li>
      ))}
    </ul>
  )
}
