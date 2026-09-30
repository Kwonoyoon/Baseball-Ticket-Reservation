import { useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { COMMUNITY_INTRO_MS, prefersReducedMotion } from '../lib/communityIntro'

type BackgroundWashProps = {
  /** 칠할 배경색 */
  color: string
  /** 다 칠했을 때. 부모가 페이지 바탕(--bg)을 이 색으로 바꾸고 이 층을 걷어 낸다. */
  onDone: () => void
}

/**
 * 페이지 바탕을 오른쪽에서 왼쪽으로 새 색으로 칠하는 층. 구단 띠가 펼쳐지는 속도와 같다.
 * 본문 뒤(z-index -1)에서 화면 전체를 덮고, 다 칠하면 부모가 바탕색을 바꾼 뒤 걷어 낸다.
 */
export function BackgroundWash({ color, onDone }: BackgroundWashProps) {
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
      className="community-wash"
      style={{ background: color, '--intro-ms': `${COMMUNITY_INTRO_MS}ms` } as CSSProperties}
      aria-hidden="true"
    />,
    document.body,
  )
}
