/** 화면이 아직 움직이는 중인지 확인하는 간격 */
const CHECK_MS = 150
/** 이 시간이 지나면 더 기다리지 않고 자리를 맞춘다. */
const GIVE_UP_MS = 3_000

/**
 * 카드를 고정 헤더 아래로 옮긴다.
 *
 * 부드러운 이동이 통하지 않는 환경이 있어 자리를 한 번 확인하는데,
 * 이동하는 도중에 끼어들면 화면이 뚝 끊기므로 멈춘 뒤에만 맞춘다.
 * 정리 함수를 돌려주므로 useEffect에서 그대로 반환하면 된다.
 */
export function scrollPanelIntoView(panel: HTMLElement | null): (() => void) | undefined {
  // jsdom 등 scrollIntoView가 없는 환경에서는 건너뛴다.
  if (!panel?.scrollIntoView) return undefined

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })

  let lastY = window.scrollY
  let waited = 0
  const timer = window.setInterval(() => {
    waited += CHECK_MS
    if (window.scrollY !== lastY && waited < GIVE_UP_MS) {
      lastY = window.scrollY
      return
    }
    window.clearInterval(timer)
    if (panel.getBoundingClientRect().top > window.innerHeight / 2) {
      panel.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }, CHECK_MS)

  return () => window.clearInterval(timer)
}
