import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { BACKGROUND_WASH_MS, BANNER_REVEAL_MS, COMMUNITY_INTRO_MS, prefersReducedMotion } from '../lib/communityIntro'

type BackgroundWashProps = {
  /** 칠할 배경색 */
  color: string
  /** 색이 퍼지기 시작하는 곳(구단 띠). 이 요소의 한가운데서부터 원이 커지듯 칠한다. */
  originRef: RefObject<HTMLElement | null>
  /** 다 칠했을 때. 부모가 페이지 바탕(--bg)을 이 색으로 바꾸고 이 층을 걷어 낸다. */
  onDone: () => void
}

/**
 * 페이지 바탕을 새 색으로 칠하는 층. 구단 띠가 다 펼쳐진 뒤, 띠 한가운데서부터 원이 커지듯 화면 전체로 퍼진다.
 * 본문 뒤(z-index -1)에서 화면 전체를 덮고, 다 칠하면 부모가 바탕색을 바꾼 뒤 걷어 낸다.
 */
export function BackgroundWash({ color, originRef, onDone }: BackgroundWashProps) {
  const washRef = useRef<HTMLDivElement>(null)

  // 화면에 그리기 전에 띠 한가운데 위치를 재 둔다. (층이 화면에 고정돼 있으므로 화면 기준 좌표)
  useLayoutEffect(() => {
    const origin = originRef.current?.getBoundingClientRect()
    if (!origin || !washRef.current) return
    washRef.current.style.setProperty('--origin-x', `${origin.left + origin.width / 2}px`)
    washRef.current.style.setProperty('--origin-y', `${origin.top + origin.height / 2}px`)
  }, [originRef])

  useEffect(() => {
    if (prefersReducedMotion()) {
      onDone()
      return undefined
    }
    // 애니메이션 끝 이벤트는 탭이 가려져 있으면 오지 않을 수 있어, 시간으로 마무리한다.
    const timer = setTimeout(onDone, COMMUNITY_INTRO_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  return createPortal(
    <div
      ref={washRef}
      className="community-wash"
      style={
        {
          background: color,
          '--wash-ms': `${BACKGROUND_WASH_MS}ms`,
          '--wash-delay': `${BANNER_REVEAL_MS}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
    />,
    document.body,
  )
}
