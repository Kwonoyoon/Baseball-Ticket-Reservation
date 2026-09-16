import type { SeatSection } from '../api/types'
import { STADIUM_BLOCK_CODES } from './jamsilMap'

/** 이 구장의 구역들이 좌석 배치도와 연결되어 있는지 확인한다. */
export function hasStadiumMap(sections: SeatSection[]): boolean {
  return sections.some((section) => section.code !== null && STADIUM_BLOCK_CODES.has(section.code))
}

export function remainingLabel(remaining: number | undefined): string {
  if (remaining === undefined) return '잔여석 확인 중'
  return remaining > 0 ? `잔여 ${remaining.toLocaleString('ko-KR')}석` : '매진'
}
