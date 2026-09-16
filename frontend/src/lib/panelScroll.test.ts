import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollPanelIntoView } from './panelScroll'

/** 화면 위치를 마음대로 바꿀 수 있는 가짜 카드 */
function fakePanel(top: number) {
  const calls: (ScrollIntoViewOptions | undefined)[] = []
  const panel = {
    top,
    calls,
    scrollIntoView(options?: ScrollIntoViewOptions) {
      calls.push(options)
    },
    getBoundingClientRect: () => ({ top: panel.top }) as DOMRect,
  }
  return panel as unknown as HTMLElement & { top: number; calls: typeof calls }
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true })
}

describe('scrollPanelIntoView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setScrollY(0)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('이동하는 동안에는 끼어들지 않는다', () => {
    const panel = fakePanel(1000)
    scrollPanelIntoView(panel)
    expect(panel.calls).toEqual([{ behavior: 'smooth', block: 'start' }])

    // 부드럽게 내려가는 중 (위치가 계속 바뀐다)
    for (const y of [100, 300, 600, 900]) {
      setScrollY(y)
      vi.advanceTimersByTime(150)
    }

    // 아직 도착하지 않았지만 끊기지 않도록 그대로 둔다.
    expect(panel.calls).toHaveLength(1)
  })

  it('멈췄는데 카드가 화면 아래에 있으면 자리를 맞춘다', () => {
    const panel = fakePanel(1000)
    scrollPanelIntoView(panel)

    // 화면이 전혀 움직이지 않는 환경
    vi.advanceTimersByTime(150)

    expect(panel.calls).toEqual([
      { behavior: 'smooth', block: 'start' },
      { behavior: 'auto', block: 'start' },
    ])
  })

  it('이동이 끝나 제자리에 오면 다시 옮기지 않는다', () => {
    const panel = fakePanel(1000)
    scrollPanelIntoView(panel)

    setScrollY(500)
    vi.advanceTimersByTime(150)
    // 도착: 카드가 헤더 바로 아래에 있고 화면도 멈췄다.
    panel.top = 84
    vi.advanceTimersByTime(150)

    expect(panel.calls).toHaveLength(1)
  })

  it('정리 함수를 부르면 더 이상 확인하지 않는다', () => {
    const panel = fakePanel(1000)
    const cleanup = scrollPanelIntoView(panel)
    cleanup?.()

    vi.advanceTimersByTime(1000)

    expect(panel.calls).toHaveLength(1)
  })
})
