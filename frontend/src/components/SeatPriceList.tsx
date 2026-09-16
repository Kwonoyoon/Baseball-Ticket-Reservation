import type { SeatSection } from '../api/types'
import { formatPrice } from '../lib/format'

type SeatPriceListProps = {
  sections: SeatSection[]
}

/** 등급별 좌석 가격. 블록이 53개라 등급 단위로 묶어 비싼 순으로 보여준다. */
export function SeatPriceList({ sections }: SeatPriceListProps) {
  const grades = new Map<string, { grade: string; label: string; price: number }>()
  for (const section of sections) {
    const current = grades.get(section.grade)
    grades.set(section.grade, {
      grade: section.grade,
      label: section.gradeLabel,
      price: Math.min(current?.price ?? section.price, section.price),
    })
  }
  const prices = [...grades.values()].sort((a, b) => b.price - a.price)

  return (
    <ul className="seat-price-list" aria-label="좌석 등급별 가격">
      {prices.map((grade) => (
        <li key={grade.grade} className={`grade--${grade.grade.toLowerCase()}`}>
          <span className="seat-price-list__chip" aria-hidden="true" />
          <span className="seat-price-list__label">{grade.label}</span>
          <strong className="seat-price-list__price">{formatPrice(grade.price)}</strong>
        </li>
      ))}
    </ul>
  )
}
