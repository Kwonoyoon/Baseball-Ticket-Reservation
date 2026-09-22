import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSlide } from './useAutoSlide'

describe('useAutoSlide', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('3초마다 다음 장으로 넘어가고 마지막 장 다음은 처음이다', () => {
    const { result } = renderHook(() => useAutoSlide(3, false))
    expect(result.current.index).toBe(0)

    act(() => vi.advanceTimersByTime(2999))
    expect(result.current.index).toBe(0)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)

    act(() => vi.advanceTimersByTime(3000))
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.index).toBe(0)
  })

  it('멈춘 동안에는 넘어가지 않고, 다시 풀면 그때부터 센다', () => {
    const { result, rerender } = renderHook(({ paused }) => useAutoSlide(3, paused), {
      initialProps: { paused: true },
    })

    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.index).toBe(0)

    rerender({ paused: false })
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.index).toBe(1)
  })

  it('직접 옮기면 남은 시간이 아니라 그때부터 3초를 다시 센다', () => {
    const { result } = renderHook(() => useAutoSlide(3, false))

    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.goTo(2))
    expect(result.current.index).toBe(2)

    // 2초 남아 있었다면 여기서 넘어갔을 것이다.
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.index).toBe(2)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.index).toBe(0)
  })

  it('한 장뿐이면 타이머를 걸지 않는다', () => {
    const { result } = renderHook(() => useAutoSlide(1, false))
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.index).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('움직임 줄이기 설정이면 저절로 넘어가지 않는다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { result } = renderHook(() => useAutoSlide(3, false))

    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.index).toBe(0)
  })

  it('장 수가 줄어 번호가 범위를 벗어나도 마지막 장 안쪽으로 접는다', () => {
    const { result, rerender } = renderHook(({ count }) => useAutoSlide(count, true), {
      initialProps: { count: 5 },
    })
    act(() => result.current.goTo(4))

    rerender({ count: 2 })

    expect(result.current.index).toBe(0)
  })
})
