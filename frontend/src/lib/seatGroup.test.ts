import { describe, expect, it } from 'vitest'
import { findAdjacentGroup } from './seatGroup'

/** 사용할 수 없는 좌석 번호 목록으로 판별 함수를 만든다. */
function unavailable(...taken: number[]) {
  return (seatNo: number) => !taken.includes(seatNo)
}

describe('findAdjacentGroup', () => {
  it('커서 자리부터 오른쪽으로 연속 좌석을 잡는다', () => {
    expect(findAdjacentGroup(10, 3, 3, unavailable())).toEqual([3, 4, 5])
  })

  it('1석이면 커서 자리만 잡는다', () => {
    expect(findAdjacentGroup(10, 7, 1, unavailable())).toEqual([7])
  })

  it('오른쪽이 막히면 왼쪽으로 확장한다', () => {
    expect(findAdjacentGroup(10, 5, 3, unavailable(6, 7))).toEqual([3, 4, 5])
  })

  it('열 끝에서는 왼쪽으로 확장한다', () => {
    expect(findAdjacentGroup(10, 10, 2, unavailable())).toEqual([9, 10])
  })

  it('커서 자리를 포함하는 묶음만 고른다', () => {
    expect(findAdjacentGroup(10, 5, 2, unavailable(4, 6))).toBeNull()
  })

  it('판매되었거나 다른 고객이 선점한 자리면 잡지 않는다', () => {
    expect(findAdjacentGroup(10, 5, 2, unavailable(5))).toBeNull()
  })

  it('연속 좌석이 부족하면 null을 돌려준다', () => {
    expect(findAdjacentGroup(4, 2, 4, unavailable(1))).toBeNull()
    expect(findAdjacentGroup(3, 2, 4, unavailable())).toBeNull()
  })

  it('범위를 벗어난 입력은 null을 돌려준다', () => {
    expect(findAdjacentGroup(10, 0, 2, unavailable())).toBeNull()
    expect(findAdjacentGroup(10, 11, 2, unavailable())).toBeNull()
    expect(findAdjacentGroup(10, 5, 0, unavailable())).toBeNull()
  })
})
