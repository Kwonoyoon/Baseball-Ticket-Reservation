import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameSummary, Team } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import {
  addDays,
  formatGameDate,
  formatMonthDay,
  formatTime,
  isBookable,
  todayInSeoul,
  weekdayLabel,
} from '../lib/format'

const DAYS_TO_SHOW = 14

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayInSeoul()
  const dates = useMemo(() => Array.from({ length: DAYS_TO_SHOW }, (_, index) => addDays(today, index)), [today])

  const dateParam = searchParams.get('date')
  const selectedDate = dateParam && dates.includes(dateParam) ? dateParam : today
  const teamParam = Number(searchParams.get('team'))
  const selectedTeamId = Number.isInteger(teamParam) && teamParam > 0 ? teamParam : null

  const [teams, setTeams] = useState<Team[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  // 결과를 요청 키와 함께 저장해 두고, 조건이 바뀌면 렌더링 중에 로딩 상태로 판단한다.
  const requestKey = `${selectedDate}|${selectedTeamId ?? 'all'}|${reloadKey}`
  const [result, setResult] = useState<{ key: string; games?: GameSummary[]; error?: string } | null>(null)
  const currentResult = result?.key === requestKey ? result : null
  const games = currentResult?.games ?? null
  const error = currentResult?.error ?? null

  useEffect(() => {
    const controller = new AbortController()
    api
      .getTeams(controller.signal)
      .then(setTeams)
      .catch(() => {
        // 구단 필터는 부가 기능이므로 실패해도 일정 목록은 보여준다.
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getSchedule(selectedDate, selectedTeamId, controller.signal)
      .then((schedule) => setResult({ key: requestKey, games: schedule }))
      .catch((e: unknown) => {
        if (!isAbortError(e)) {
          setResult({ key: requestKey, error: errorMessage(e, '경기 일정을 불러오지 못했습니다.') })
        }
      })
    return () => controller.abort()
  }, [selectedDate, selectedTeamId, requestKey])

  const updateParams = (next: { date?: string; team?: number | null }) => {
    const params = new URLSearchParams(searchParams)
    if (next.date !== undefined) params.set('date', next.date)
    if (next.team === null) params.delete('team')
    else if (next.team !== undefined) params.set('team', String(next.team))
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="schedule">
      <section className="hero">
        <p className="hero__eyebrow">2026 KBO 리그</p>
        <h1 className="hero__title">오늘은 어느 구장으로 갈까요?</h1>
        <p className="hero__desc">날짜와 응원 구단을 고르고, 원하는 좌석을 바로 예매하세요.</p>
      </section>

      <div className="date-strip" aria-label="경기 날짜 선택">
        {dates.map((date) => {
          const weekday = weekdayLabel(date)
          const classes = ['date-chip', weekday === '토' && 'is-sat', weekday === '일' && 'is-sun']
          return (
            <button
              key={date}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              aria-pressed={date === selectedDate}
              onClick={() => updateParams({ date })}
            >
              <span className="date-chip__weekday">{date === today ? '오늘' : weekday}</span>
              <span className="date-chip__day">{formatMonthDay(date)}</span>
            </button>
          )
        })}
      </div>

      {teams.length > 0 && (
        <div className="team-filter" role="group" aria-label="구단 필터">
          <button
            type="button"
            className="team-chip"
            aria-pressed={selectedTeamId === null}
            onClick={() => updateParams({ team: null })}
          >
            전체
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className="team-chip"
              style={{ '--team-color': team.primaryColor } as CSSProperties}
              aria-pressed={selectedTeamId === team.id}
              onClick={() => updateParams({ team: team.id })}
            >
              {team.shortName}
            </button>
          ))}
        </div>
      )}

      <h2 className="section-title">{formatGameDate(selectedDate)} 경기</h2>

      {error ? (
        <ErrorMessage message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : games === null ? (
        <Loading label="경기 일정을 불러오는 중…" />
      ) : games.length === 0 ? (
        <EmptyState
          title="예정된 경기가 없습니다."
          description={
            weekdayLabel(selectedDate) === '월'
              ? '월요일은 KBO 리그 정규 휴식일입니다.'
              : '다른 날짜나 구단을 선택해 보세요.'
          }
        />
      ) : (
        <ul className="game-list">
          {games.map((game) => (
            <li key={game.id}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GameCard({ game }: { game: GameSummary }) {
  const bookable = isBookable(game.startAt)

  return (
    <article className="game-card">
      <div className="game-card__time">
        <strong>{formatTime(game.startAt)}</strong>
        <span>{game.stadium.name}</span>
      </div>

      <div className="matchup">
        <div className="matchup__team matchup__team--away">
          <span className="matchup__label">
            <span className="matchup__name">{game.awayTeam.name}</span>
            <span className="matchup__role">원정</span>
          </span>
          <TeamMark team={game.awayTeam} />
        </div>
        <span className="matchup__vs">VS</span>
        <div className="matchup__team">
          <TeamMark team={game.homeTeam} />
          <span className="matchup__label">
            <span className="matchup__name">{game.homeTeam.name}</span>
            <span className="matchup__role">홈</span>
          </span>
        </div>
      </div>

      {bookable ? (
        <Link className="button button--primary" to={`/games/${game.id}`}>
          예매하기
        </Link>
      ) : (
        <span className="button button--disabled" aria-disabled="true">
          예매 마감
        </span>
      )}
    </article>
  )
}
