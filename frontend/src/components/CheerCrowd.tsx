import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { BANNER_REVEAL_MS, COMMUNITY_INTRO_MS, prefersReducedMotion } from '../lib/communityIntro'

/** 응원 장면이 떠 있는 시간. 글이 올라오기 시작할 즈음 관중이 내려가며 사라진다. */
const CHEER_LIFE_MS = COMMUNITY_INTRO_MS + 400
/** 관중 수 (좁은 화면에서는 CSS가 절반만 보여 준다) */
const FANS = 20
const CONFETTI = 44
const FLASHES = 16

/** 늘 같은 값을 주는 0~1 사이 수. 그릴 때마다 모양이 바뀌지 않게 Math.random 대신 쓴다. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const SKIN_TONES = ['#f3cfb3', '#e8b98f', '#d9a066', '#c68642']

/** 응원 방법: 막대풍선 부딪치기, 응원 수건 흔들기, 폼 손가락 흔들기, 만세 */
type Cheer = 'bang' | 'towel' | 'finger' | 'hurray'
const CHEERS: Cheer[] = ['bang', 'towel', 'finger', 'hurray']

/**
 * 야구장 관중 한 명. 구단 모자를 쓰고 유니폼(구단 색 또는 흰색 홈 유니폼)을 입었다.
 * 몸은 화면 아래로 더 길게 그려, 뛰어올라도 몸 끝이 드러나 잘려 보이지 않는다.
 */
function Fan({ cheer }: { cheer: Cheer }) {
  return (
    <svg viewBox="0 0 40 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {/* 들고 흔드는 것 (몸보다 뒤) */}
      <g className={`fan-props fan-props--${cheer}`}>
        {cheer === 'bang' && (
          <>
            <path className="fan-arm" d="M10 66 L7 40" />
            <path className="fan-arm" d="M30 66 L33 40" />
            <rect className="fan-balloon" x="2" y="10" width="6" height="32" rx="3" transform="rotate(-14 7 40)" />
            <rect
              className="fan-balloon fan-balloon--b"
              x="32"
              y="10"
              width="6"
              height="32"
              rx="3"
              transform="rotate(14 33 40)"
            />
            <circle className="fan-skin" cx="7" cy="40" r="3" />
            <circle className="fan-skin" cx="33" cy="40" r="3" />
          </>
        )}
        {cheer === 'towel' && (
          <>
            <path className="fan-arm" d="M10 66 L6 34" />
            <path className="fan-arm" d="M30 66 L34 34" />
            <rect className="fan-towel" x="1" y="22" width="38" height="12" rx="1.5" />
            <rect className="fan-towel-stripe" x="1" y="26.5" width="38" height="3" />
            <circle className="fan-skin" cx="6" cy="34" r="3" />
            <circle className="fan-skin" cx="34" cy="34" r="3" />
          </>
        )}
        {cheer === 'finger' && (
          <>
            <path className="fan-arm" d="M30 66 L34 36" />
            <rect className="fan-foam" x="28" y="18" width="12" height="18" rx="4" />
            <rect className="fan-foam" x="31.5" y="4" width="5" height="16" rx="2.5" />
          </>
        )}
        {cheer === 'hurray' && (
          <>
            <path className="fan-arm" d="M10 66 L3 42" />
            <path className="fan-arm" d="M30 66 L37 42" />
            <circle className="fan-skin" cx="3" cy="42" r="3" />
            <circle className="fan-skin" cx="37" cy="42" r="3" />
          </>
        )}
      </g>
      {/* 몸(유니폼). 화면 아래로 이어진다. */}
      <path className="fan-jersey" d="M5 120 V74 Q5 63 16 61 H24 Q35 63 35 74 V120 Z" />
      <path className="fan-collar" d="M16 61.5 L20 67 L24 61.5" />
      <rect className="fan-trim" x="5" y="84" width="30" height="2.5" />
      {/* 얼굴과 모자 */}
      <circle className="fan-skin" cx="20" cy="52" r="9" />
      <path className="fan-cap" d="M11 51 Q11 40 20 40 Q29 40 29 51 Z" />
      <ellipse className="fan-cap" cx="20" cy="51" rx="12" ry="2.6" />
      <circle className="fan-cap-button" cx="20" cy="40.6" r="1.3" />
    </svg>
  )
}

type CheerCrowdProps = {
  /** 구단 색 */
  color: string
}

/**
 * 커뮤니티에 들어와 글이 올라오기 전까지, 화면 아래에 경기장 응원 장면을 잠깐 보여 준다.
 * 구단 모자·유니폼 차림 관중이 올라와 파도타기를 하며 막대풍선·응원 수건·폼 손가락을 흔들고,
 * 꽃가루가 터지고, 카메라 플래시가 반짝인다.
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

  const fans = Array.from({ length: FANS }, (_, i) => (
    <span
      key={i}
      className={`cheer__fan${i % 5 === 2 ? ' cheer__fan--home' : ''}`}
      style={
        {
          '--h': `${112 + Math.round(noise(i, 1) * 26)}px`,
          // 오른쪽에서 왼쪽으로 차례로 뛰어오르는 파도타기 (띠가 펼쳐지는 방향과 같다)
          '--d': `${(FANS - 1 - i) * 45}ms`,
          '--sd': `${Math.round(noise(i, 2) * 300)}ms`,
          '--skin': SKIN_TONES[Math.floor(noise(i, 11) * SKIN_TONES.length)],
        } as CSSProperties
      }
    >
      <Fan cheer={CHEERS[i % CHEERS.length]} />
    </span>
  ))

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
