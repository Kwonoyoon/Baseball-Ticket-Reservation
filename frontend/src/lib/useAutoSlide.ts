import { useEffect, useState } from 'react'

export const SLIDE_INTERVAL_MS = 3000

/**
 * 슬라이드를 일정 간격으로 다음 장으로 넘기고, 현재 장 번호와 직접 이동 함수를 돌려준다.
 *
 * setInterval 대신 index가 바뀔 때마다 새 setTimeout을 건다. 그래야 사용자가 점을 눌러
 * 옮겨 갔을 때 남은 시간이 아니라 그 시점부터 다시 3초를 센다.
 */
export function useAutoSlide(count: number, paused: boolean, intervalMs = SLIDE_INTERVAL_MS) {
  const [index, setIndex] = useState(0)

  // 데이터가 다시 불러와져 장 수가 줄어도 범위를 벗어난 번호를 쓰지 않는다.
  const current = count > 0 ? index % count : 0

  useEffect(() => {
    if (paused || count < 2) return undefined
    // 움직임을 줄이는 설정을 켠 사용자에게는 저절로 넘어가는 동작을 하지 않는다.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const timer = window.setTimeout(() => setIndex((current + 1) % count), intervalMs)
    return () => window.clearTimeout(timer)
  }, [current, paused, count, intervalMs])

  return { index: current, goTo: setIndex }
}
