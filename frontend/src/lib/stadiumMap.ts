import type { SeatSection } from '../api/types'
import { STADIUM_LAYOUTS, type StadiumLayout } from './stadiumMaps'

/** 구장 코드(stadiums.code)로 좌석 배치도를 찾는다. 코드가 없거나 배치도가 없는 구장은 null */
export function stadiumLayout(code: string | null | undefined): StadiumLayout | null {
  return (code && STADIUM_LAYOUTS[code]) || null
}

/** 이 구장의 구역들이 배치도 블록과 연결되어 있는지 확인한다. */
export function hasStadiumMap(layout: StadiumLayout | null, sections: SeatSection[]): layout is StadiumLayout {
  if (!layout) return false
  const codes = new Set(layout.blocks.map((block) => block.code))
  return sections.some((section) => section.code !== null && codes.has(section.code))
}

export function remainingLabel(remaining: number | undefined): string {
  if (remaining === undefined) return '잔여석 확인 중'
  return remaining > 0 ? `잔여 ${remaining.toLocaleString('ko-KR')}석` : '매진'
}
