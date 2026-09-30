import { useEffect, useState, type CSSProperties, type FocusEvent } from 'react'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameSummary } from '../api/types'
import { addDays, formatGameDate, formatMonthDay, formatTime, todayInSeoul } from '../lib/format'
import { teamNameEn } from '../lib/teamNames'
import { useAutoSlide } from '../lib/useAutoSlide'
import { TeamMark } from './TeamMark'

/** 오늘 경기가 없는 날(월요일 휴식일)에 다음 경기일을 찾아볼 최대 일수 */
const LOOKAHEAD_DAYS = 3

type HeroState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; date: string; games: GameSummary[] }

/** 오늘부터 차례로 보며 경기가 있는 첫 날의 경기 목록을 찾는다. 휴식일은 월요일뿐이라 보통 한 번 더 조회하면 끝난다. */
async function loadHeroGames(signal: AbortSignal) {
  const today = todayInSeoul()
  for (let offset = 0; offset < LOOKAHEAD_DAYS; offset += 1) {
    const date = addDays(today, offset)
    const games = await api.getSchedule(date, null, signal)
    if (games.length > 0) return { date, games }
  }
  return { date: today, games: [] as GameSummary[] }
}

/** 오늘의 경기를 한 장씩 3초마다 옆으로 넘겨 보여주는 고정 높이 배너. */
export function TodayHero() {
  const [state, setState] = useState<HeroState>({ status: 'loading' })
  // 마우스를 올렸거나 키보드로 점에 포커스가 있으면 넘기지 않는다. 둘 중 하나만 풀려도 다시 넘기면 안 되므로 따로 든다.
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const games = state.status === 'ready' ? state.games : []
  const { index, goTo } = useAutoSlide(games.length, hovered || focused)

  useEffect(() => {
    const controller = new AbortController()
    loadHeroGames(controller.signal)
      .then((result) => setState({ status: 'ready', ...result }))
      .catch((e: unknown) => {
        // 히어로는 장식에 가까워서 실패해도 아래 일정 목록(자체 오류 표시)은 계속 쓸 수 있다.
        if (!isAbortError(e)) setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // 점에서 점으로 포커스가 옮겨 가는 동안에는 캐러셀 안에 있는 것으로 본다.
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  const today = todayInSeoul()
  const dateLabel = state.status === 'ready' && state.date !== today ? formatMonthDay(state.date) : '오늘'
  const message =
    state.status === 'error'
      ? '경기 정보를 불러오지 못했습니다.'
      : state.status === 'ready' && games.length === 0
        ? '예정된 경기가 없습니다.'
        : null

  return (
    <section
      className="home-hero"
      aria-roledescription="carousel"
      aria-label={`${dateLabel} 경기`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div className="home-hero__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {message && (
          <div className="home-slide home-slide--message">
            <p>{message}</p>
          </div>
        )}
        {games.map((game, position) => (
          <div
            key={game.id}
            className="home-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${position + 1} / ${games.length}`}
            aria-hidden={position !== index}
            style={
              { '--away-color': game.awayTeam.primaryColor, '--home-color': game.homeTeam.primaryColor } as CSSProperties
            }
          >
            <div className="home-slide__teams">
              <div className="home-slide__team">
                <TeamMark team={game.awayTeam} size="lg" />
                <strong>{teamNameEn(game.awayTeam)}</strong>
                <span>원정 · {formatTime(game.startAt)}</span>
              </div>
              <span className="home-slide__vs">VS</span>
              <div className="home-slide__team">
                <TeamMark team={game.homeTeam} size="lg" />
                <strong>{teamNameEn(game.homeTeam)}</strong>
                <span>
                  {dateLabel} · {game.stadium.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="home-hero__shade" />

      {games.length > 1 && (
        <div className="home-hero__dots">
          {games.map((game, position) => (
            <button
              key={game.id}
              type="button"
              aria-label={`${teamNameEn(game.awayTeam)} 대 ${teamNameEn(game.homeTeam)}`}
              aria-current={position === index}
              onClick={() => goTo(position)}
            />
          ))}
        </div>
      )}

      <div className="home-hero__copy">
        <div>
          <h1 className="home-hero__mark">
            Today <em>KBO</em>
          </h1>
          <p className="home-hero__sub">
            {state.status === 'ready' && games.length > 0 && (
              <>{state.date === today ? '오늘' : formatGameDate(state.date)} 경기 · </>
            )}
            2026 KBO 리그 · 날짜와 응원 구단을 고르고 좌석을 예매하세요
          </p>
        </div>
        <a className="home-hero__cta" href="#schedule">
          일정 보러가기
        </a>
      </div>
    </section>
  )
}
