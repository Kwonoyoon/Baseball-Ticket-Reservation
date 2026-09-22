/**
 * 히어로가 화면에 고정된 채 머무는 스크롤 구간(뷰포트 높이 대비).
 * SchedulePage.css의 .home-hero 높이(165vh = 고정 화면 100vh + 이 값 65vh)와 짝이다.
 */
export const HERO_RUNWAY = 0.65

/**
 * 히어로 영역 맨 위가 화면 위로 올라간 정도를 0~1로 돌려준다. 1이 되는 순간 히어로 고정이 풀린다.
 *
 * window.scrollY(페이지 맨 위부터의 거리)가 아니라 영역 자체의 위치(wrapTop)를 기준으로 삼는다.
 * scrollY를 쓰면 위에 헤더처럼 다른 요소가 있을 때 효과가 그만큼 일찍 시작해서 어긋난다.
 */
export function heroScrollProgress(wrapTop: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  const scrolled = Math.max(0, -wrapTop)
  return Math.min(1, scrolled / (viewportHeight * HERO_RUNWAY))
}
