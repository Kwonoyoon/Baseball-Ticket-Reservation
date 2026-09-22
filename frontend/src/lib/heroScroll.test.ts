import { describe, expect, it } from 'vitest'
import { heroScrollProgress } from './heroScroll'

describe('heroScrollProgress', () => {
  it('영역이 아직 화면 아래나 맨 위에 있으면 0이다', () => {
    expect(heroScrollProgress(62, 1000)).toBe(0)
    expect(heroScrollProgress(0, 1000)).toBe(0)
  })

  it('고정 구간(뷰포트의 65%)을 절반 지나면 0.5다', () => {
    expect(heroScrollProgress(-325, 1000)).toBeCloseTo(0.5)
  })

  it('고정 구간을 다 지나면 1에서 멈춘다', () => {
    expect(heroScrollProgress(-650, 1000)).toBe(1)
    expect(heroScrollProgress(-3000, 1000)).toBe(1)
  })

  it('뷰포트 높이가 0이면 0으로 나누지 않고 0을 돌려준다', () => {
    expect(heroScrollProgress(-100, 0)).toBe(0)
  })
})
