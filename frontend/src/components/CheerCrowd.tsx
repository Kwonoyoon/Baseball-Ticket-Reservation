import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { BANNER_REVEAL_MS, COMMUNITY_INTRO_MS, prefersReducedMotion } from '../lib/communityIntro'

/** 응원 장면이 떠 있는 시간. 글이 올라오기 시작할 즈음 관중이 내려가며 사라진다. */
const CHEER_LIFE_MS = COMMUNITY_INTRO_MS + 400
/** 관중 수 (좁은 화면에서는 CSS가 절반만 보여 준다) */
const FANS = 32
const CONFETTI = 44
const FLASHES = 16

/** 늘 같은 값을 주는 0~1 사이 수. 그릴 때마다 모양이 바뀌지 않게 Math.random 대신 쓴다. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

type CheerCrowdProps = {
  /** 구단 색 */
  color: string
}

/**
 * 커뮤니티에 들어와 글이 올라오기 전까지, 화면 아래에 경기장 응원 장면을 잠깐 보여 준다.
 * 구단 색 관중이 올라와 파도타기를 하고, 응원봉을 흔들고, 꽃가루가 터지고, 카메라 플래시가 반짝인다.
 * 구단이 바뀔 때마다(부모가 key로 새로 그린다) 한 번씩 나오고, 움직임 줄이기 설정이면 보여 주지 않는다.
 */
export function CheerCrowd({ color }: CheerCrowdProps) {
  const [done, setDone] = useState(false)
  const [reduceMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), CHEER_LIFE_MS)
    return () => clearTimeout(timer)
  }, [])

  if (done || reduceMotion) return null

  const fans = Array.from({ length: FANS }, (_, i) => {
    const hasStick = i % 3 === 1
    return (
      <span
        key={i}
        className="cheer__fan"
        style={
          {
            '--h': `${58 + Math.round(noise(i, 1) * 34)}px`,
            // 오른쪽에서 왼쪽으로 차례로 뛰어오르는 파도타기 (띠가 펼쳐지는 방향과 같다)
            '--d': `${(FANS - 1 - i) * 45}ms`,
          } as CSSProperties
        }
      >
        {hasStick && (
          <span
            className={`cheer__stick${i % 2 === 0 ? ' cheer__stick--gold' : ''}`}
            style={{ '--sd': `${Math.round(noise(i, 2) * 400)}ms` } as CSSProperties}
          />
        )}
      </span>
    )
  })

  const confetti = Array.from({ length: CONFETTI }, (_, i) => {
    // 절반은 처음 올라올 때, 나머지 절반은 띠가 다 펼쳐질 때 터진다.
    const secondBurst = i >= CONFETTI / 2
    const base = secondBurst ? BANNER_REVEAL_MS : 250
    return (
      <span
        key={i}
        className={`cheer__confetti cheer__confetti--${i % 4}`}
        style={
          {
            '--x': `${Math.round(noise(i, 3) * 100)}%`,
            '--dx': `${Math.round((noise(i, 4) - 0.5) * 160)}px`,
            '--dy': `${-160 - Math.round(noise(i, 5) * 180)}px`,
            '--r': `${Math.round((noise(i, 6) - 0.5) * 1080)}deg`,
            '--cd': `${base + Math.round(noise(i, 7) * 350)}ms`,
          } as CSSProperties
        }
      />
    )
  })

  const flashes = Array.from({ length: FLASHES }, (_, i) => (
    <span
      key={i}
      className="cheer__flash"
      style={
        {
          '--x': `${Math.round(noise(i, 8) * 100)}%`,
          '--y': `${20 + Math.round(noise(i, 9) * 60)}px`,
          '--fd': `${300 + Math.round(noise(i, 10) * (COMMUNITY_INTRO_MS - 600))}ms`,
        } as CSSProperties
      }
    />
  ))

  return createPortal(
    <div
      className="cheer"
      style={{ '--team-color': color, '--life-ms': `${CHEER_LIFE_MS}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="cheer__confetti-layer">{confetti}</div>
      <div className="cheer__crowd">
        {fans}
        {flashes}
      </div>
    </div>,
    document.body,
  )
}
