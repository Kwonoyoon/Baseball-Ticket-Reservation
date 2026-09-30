import { useCallback, useEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react'
import { Link } from 'react-router'
import type { Team } from '../api/types'
import { teamLogo } from '../lib/teamLogos'

/** 로고 한 칸의 너비(원 + 간격). CSS의 .team-strip__item 크기와 맞춘다. */
const STEP_PX = 98
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

/**
 * 커뮤니티 위쪽 구단 줄.
 * 가운데에는 관심 구단이 고정되고, 그 뒤로 나머지 구단 로고가 천천히 흐른다. (처음에는 왼쪽에서 오른쪽으로)
 * 양 끝 버튼은 한 칸 옮기면서 흐르는 방향도 그쪽으로 바꾼다. 커서를 올리거나 키보드로 들어오면 멈춘다.
 */
export function TeamStrip({ teams, favoriteTeam, selectedTeamId, onSelect, favoriteSettingPath }: TeamStripProps) {
  const others = teams.filter((team) => team.id !== favoriteTeam?.id)
  const setWidth = others.length * STEP_PX
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

  /** 양 끝 버튼: 흐르는 방향을 그쪽으로 바꾸고 한 칸 부드럽게 옮긴다. 옮기는 동안은 감지 않고, 다 옮긴 뒤 제자리로 감는다. */
  const nudge = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    directionRef.current = direction
    // 움직임 줄이기 설정이면 전환 없이 바로 옮긴다. (전환 끝 이벤트도 오지 않으므로 여기서 감는다)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      offsetRef.current = wrap(offsetRef.current + direction * STEP_PX)
      paint(offsetRef.current)
      return
    }
    offsetRef.current += direction * STEP_PX
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
      aria-label="구단 선택"
      onMouseEnter={() => pause(true)}
      onMouseLeave={() => pause(false)}
      onFocus={() => pause(true)}
      onBlur={() => pause(false)}
    >
      {/* 흐르는 로고가 양 끝에서 흐려지며 사라지도록 창을 하나 두고 그 안에서 움직인다. */}
      <div className="team-strip__viewport">
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
        ‹
      </button>
      <button type="button" className="team-strip__nav team-strip__nav--next" aria-label="다음 구단" onClick={() => nudge(1)}>
        ›
      </button>
    </nav>
  )
}
