import { useCallback, useEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react'
import { Link } from 'react-router'
import type { Team } from '../api/types'
import { teamLogo } from '../lib/teamLogos'

/** 로고 사이 간격. CSS의 .team-strip__track gap과 맞춘다. */
const GAP_PX = 18
/** 로고 한 칸(원 + 간격)의 최소 너비. 좁은 화면에서는 이 크기(원 80px)로 둔다. */
const MIN_STEP_PX = 98
/** 흐르는 속도. 1초에 이만큼 간다. */
const SPEED_PX_PER_SEC = 22
/** 양 끝 버튼으로 한 칸 옮기는 시간. CSS의 .team-strip__track.is-nudging 전환 시간과 맞춘다. */
const NUDGE_MS = 400
/** 이 너비까지는 줄이 끊겨 보이지 않게 복사본을 이어 붙인다. (콘텐츠 최대 폭보다 넉넉하게) */
const COVER_WIDTH_PX = 1600
/** 복사본 가운데 화면 낭독기·키보드에 보여 줄 한 벌 */
const ACCESSIBLE_COPY = 1

type TeamStripProps = {
  teams: Team[]
  favoriteTeam: Team | null
  selectedTeamId: number | null
  onSelect: (teamId: number) => void
  /** 관심 구단이 없을 때 가운데 버튼이 보낼 곳 (비회원은 로그인) */
  favoriteSettingPath: string
}

function Logo({ team }: { team: Team }) {
  const logo = teamLogo(team.code)
  return logo ? <img src={logo} alt="" /> : <span>{team.shortName}</span>
}

/** 양 끝 버튼의 화살표. 글자(‹ ›)는 가늘어서 잘 안 보이므로 굵은 선으로 그린다. */
function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 4 7 12l8 8' : 'M9 4l8 8-8 8'}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 커뮤니티 위쪽 구단 줄.
 * 가운데에는 관심 구단이 고정되고, 그 뒤로 나머지 구단 로고가 천천히 흐른다. (처음에는 왼쪽에서 오른쪽으로)
 * 양 끝 버튼은 한 칸 옮기면서 흐르는 방향도 그쪽으로 바꾼다. 커서를 올리거나 키보드로 들어오면 멈춘다.
 */
export function TeamStrip({ teams, favoriteTeam, selectedTeamId, onSelect, favoriteSettingPath }: TeamStripProps) {
  const others = teams.filter((team) => team.id !== favoriteTeam?.id)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(MIN_STEP_PX)
  const stepRef = useRef(MIN_STEP_PX)
  const setWidth = others.length * step
  // 이음매 없이 돌리려고 목록을 여러 벌 이어 붙인다. 한 벌 반만큼 왼쪽에서 시작해도 오른쪽 끝까지 덮을 만큼.
  const copies = setWidth === 0 ? 0 : Math.max(3, Math.ceil(COVER_WIDTH_PX / setWidth) + 2)

  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)
  // 커서를 올리거나 키보드로 들어오면 멈춘다. 버튼으로 옮기는 동안에도 멈춘다.
  const hoveredRef = useRef(false)
  // 흐르는 방향. 1이면 오른쪽, -1이면 왼쪽. 양 끝 버튼을 누르면 그쪽으로 바뀐다.
  // (방향을 그대로 두면 ‹ 로 옮겨도 곧 오른쪽 흐름에 밀려 제자리로 되돌아온다)
  const directionRef = useRef<-1 | 1>(1)
  const nudgingRef = useRef(false)
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [nudging, setNudging] = useState(false)

  /** 한 벌 너비 안으로 감는다. 한 벌만큼 옮겨도 모양이 같아서 감아도 화면이 튀지 않는다. */
  const wrap = useCallback(
    (value: number) => (setWidth === 0 ? 0 : ((value % setWidth) + setWidth) % setWidth),
    [setWidth],
  )
  const paint = useCallback(
    (value: number) => {
      if (trackRef.current) trackRef.current.style.transform = `translateX(${value - setWidth * 1.5}px)`
    },
    [setWidth],
  )

  useEffect(() => {
    if (setWidth === 0) return undefined
    paint(offsetRef.current)

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || typeof requestAnimationFrame !== 'function') return undefined

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 100) // 탭을 오래 비웠다 돌아와도 한 번에 튀지 않게
      last = now
      if (!pausedRef.current) {
        offsetRef.current = wrap(offsetRef.current + (directionRef.current * SPEED_PX_PER_SEC * elapsed) / 1000)
        paint(offsetRef.current)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [setWidth, paint, wrap])

  useEffect(() => () => clearTimeout(nudgeTimerRef.current), [])

  // 띠가 넓으면 로고를 키워, 한 바퀴 안에서 같은 구단 로고가 동시에 두 번 보이지 않게 한다.
  // 같은 로고끼리는 한 벌(setWidth)만큼 떨어져 있으므로, 한 벌이 "보이는 폭 + 로고 하나"보다 넓으면
  // 한 로고가 다 빠져나간 뒤에야 같은 로고가 반대쪽에서 들어온다.
  //   count × step ≥ 보이는 폭 + (step − 간격)  →  step ≥ (보이는 폭 − 간격) / (count − 1)
  const count = others.length
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || count < 2) return undefined
    const fit = (visibleWidth: number) => {
      const next = Math.max(MIN_STEP_PX, Math.ceil((visibleWidth - GAP_PX) / (count - 1)))
      if (next === stepRef.current) return
      // 크기가 바뀌어도 줄이 튀지 않게 흐른 거리도 같은 비율로 맞춘다.
      offsetRef.current = (offsetRef.current * next) / stepRef.current
      stepRef.current = next
      setStep(next)
    }
    // 처음 한 번은 바로 잰다. (탭이 가려져 있으면 크기 알림이 늦게 온다)
    fit(viewport.clientWidth)
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [count])

  /** 양 끝 버튼: 흐르는 방향을 그쪽으로 바꾸고 한 칸 부드럽게 옮긴다. 옮기는 동안은 감지 않고, 다 옮긴 뒤 제자리로 감는다. */
  const nudge = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    directionRef.current = direction
    // 움직임 줄이기 설정이면 전환 없이 바로 옮긴다. (전환 끝 이벤트도 오지 않으므로 여기서 감는다)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      offsetRef.current = wrap(offsetRef.current + direction * step)
      paint(offsetRef.current)
      return
    }
    offsetRef.current += direction * step
    pausedRef.current = true
    nudgingRef.current = true
    setNudging(true)
    paint(offsetRef.current)
    // 탭이 가려져 있으면 전환 끝 이벤트가 오지 않을 수 있다. 그래도 멈춘 채로 남지 않게 시간이 지나면 마무리한다.
    clearTimeout(nudgeTimerRef.current)
    nudgeTimerRef.current = setTimeout(settleNudge, NUDGE_MS + 100)
  }

  const finishNudge = (event: TransitionEvent<HTMLDivElement>) => {
    // 로고 버튼의 hover 전환도 여기까지 올라오므로, 줄 자체가 옮겨진 경우만 받는다.
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    settleNudge()
  }

  /** 다 옮긴 뒤 제자리로 감고 흐름을 다시 잇는다. 전환 끝 이벤트와 시간 초과 중 먼저 오는 쪽이 한 번만 한다. */
  const settleNudge = () => {
    if (!nudgingRef.current) return
    nudgingRef.current = false
    clearTimeout(nudgeTimerRef.current)
    setNudging(false)
    offsetRef.current = wrap(offsetRef.current)
    // 전환 효과를 먼저 끄고 감아야 이음매에서 한 바퀴 도는 모습이 보이지 않는다.
    if (trackRef.current) trackRef.current.style.transition = 'none'
    paint(offsetRef.current)
    requestAnimationFrame?.(() => {
      if (trackRef.current) trackRef.current.style.transition = ''
    })
    pausedRef.current = hoveredRef.current
  }

  const pause = (paused: boolean) => {
    hoveredRef.current = paused
    if (!nudgingRef.current) pausedRef.current = paused
  }

  return (
    <nav
      className="team-strip"
      style={{ '--strip-item': `${step - GAP_PX}px` } as CSSProperties}
      aria-label="구단 선택"
      onMouseEnter={() => pause(true)}
      onMouseLeave={() => pause(false)}
      onFocus={() => pause(true)}
      onBlur={() => pause(false)}
    >
      {/* 흐르는 로고가 양 끝에서 흐려지며 사라지도록 창을 하나 두고 그 안에서 움직인다. */}
      <div ref={viewportRef} className="team-strip__viewport">
        <div
          ref={trackRef}
          className={`team-strip__track${nudging ? ' is-nudging' : ''}`}
          onTransitionEnd={finishNudge}
        >
          {Array.from({ length: copies }, (_, copy) =>
            others.map((team) => {
              const hidden = copy !== ACCESSIBLE_COPY
              return (
                <button
                  key={`${copy}-${team.id}`}
                  type="button"
                  className={`team-strip__item${team.id === selectedTeamId ? ' is-selected' : ''}`}
                  style={{ '--team-color': team.primaryColor } as CSSProperties}
                  aria-label={hidden ? undefined : `${team.name} 게시판`}
                  aria-pressed={hidden ? undefined : team.id === selectedTeamId}
                  aria-hidden={hidden || undefined}
                  tabIndex={hidden ? -1 : undefined}
                  onClick={() => onSelect(team.id)}
                >
                  <Logo team={team} />
                  {/* 커서를 올리면 로고 아래에 나타난다. 이름은 aria-label로 이미 읽히므로 화면에만 보인다. */}
                  <span className="team-strip__name" aria-hidden="true">
                    {team.name}
                  </span>
                </button>
              )
            }),
          )}
        </div>
      </div>

      {favoriteTeam ? (
        <button
          type="button"
          className={`team-strip__center${favoriteTeam.id === selectedTeamId ? ' is-selected' : ''}`}
          style={{ '--team-color': favoriteTeam.primaryColor } as CSSProperties}
          aria-label={`${favoriteTeam.name} 게시판 (관심 구단)`}
          aria-pressed={favoriteTeam.id === selectedTeamId}
          onClick={() => onSelect(favoriteTeam.id)}
        >
          <Logo team={favoriteTeam} />
          <span className="team-strip__center-label">관심 구단</span>
        </button>
      ) : (
        <Link to={favoriteSettingPath} className="team-strip__center team-strip__center--empty">
          <span className="team-strip__plus" aria-hidden="true">
            +
          </span>
          관심 구단 설정
        </Link>
      )}

      <button type="button" className="team-strip__nav team-strip__nav--prev" aria-label="이전 구단" onClick={() => nudge(-1)}>
        <Chevron direction="left" />
      </button>
      <button type="button" className="team-strip__nav team-strip__nav--next" aria-label="다음 구단" onClick={() => nudge(1)}>
        <Chevron direction="right" />
      </button>
    </nav>
  )
}
