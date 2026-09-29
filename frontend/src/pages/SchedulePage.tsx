import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameSummary, Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { ChevronRightIcon } from '../components/icons'
import { Header } from '../components/Header'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { TeamMark } from '../components/TeamMark'
import { TodayHero } from '../components/TodayHero'
import {
  addDays,
  formatGameDate,
  formatMonthDay,
  formatTime,
  isBookable,
  todayInSeoul,
  weekdayLabel,
} from '../lib/format'
import './SchedulePage.css'

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

  const selectedDateLabel =
    selectedDate === today ? `오늘 (${weekdayLabel(today)})` : formatGameDate(selectedDate)

  return (
    <div className="home">
      <Header />
      <TodayHero />

      <main className="home-main" id="schedule">
        {teams.length > 0 && (
          <TeamFilterRail teams={teams} selectedTeamId={selectedTeamId} onSelect={(team) => updateParams({ team })} />
        )}

        <div className="home-dates" aria-label="경기 날짜 선택">
          {dates.map((date) => {
            const weekday = weekdayLabel(date)
            const classes = ['home-date', weekday === '토' && 'is-sat', weekday === '일' && 'is-sun']
            return (
              <button
                key={date}
                type="button"
                className={classes.filter(Boolean).join(' ')}
                aria-pressed={date === selectedDate}
                onClick={() => updateParams({ date })}
              >
                <span className="home-date__weekday">{date === today ? '오늘' : weekday}</span>
                <span className="home-date__day">{formatMonthDay(date)}</span>
              </button>
            )
          })}
        </div>

        <div className="home-section-head">
          <h2 className="home-section-title">{selectedDateLabel} 경기</h2>
          {games !== null && games.length > 0 && <span className="home-section-count">{games.length}경기</span>}
        </div>

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
          <ul className="home-games">
            {games.map((game) => (
              <li key={game.id}>
                <GameCard game={game} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="home-footer">
        SAFETICKET은 학습용 사이드 프로젝트입니다. 실제 결제가 이루어지지 않으며 경기 일정은 샘플 데이터입니다.
      </footer>
    </div>
  )
}

type TeamFilterRailProps = {
  teams: Team[]
  selectedTeamId: number | null
  onSelect: (teamId: number | null) => void
}

/** 구단 필터를 원형 로고 캐러셀로 보여준다. 넘칠 때만 오른쪽에 화살표 버튼을 띄운다. */
function TeamFilterRail({ teams, selectedTeamId, onSelect }: TeamFilterRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const update = () => setCanScroll(track.scrollWidth > track.clientWidth + 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [teams])

  return (
    <div className="home-team-rail">
      <div
        className={`home-team-rail__track${canScroll ? ' is-scrollable' : ''}`}
        ref={trackRef}
        role="group"
        aria-label="구단 필터"
      >
        <button
          type="button"
          className="home-team-card"
          aria-pressed={selectedTeamId === null}
          onClick={() => onSelect(null)}
        >
          <span className="home-team-card__all">전체</span>
          <span className="home-team-card__label">전체</span>
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className="home-team-card"
            style={{ '--team-color': team.primaryColor } as CSSProperties}
            aria-pressed={selectedTeamId === team.id}
            onClick={() => onSelect(team.id)}
          >
            <TeamMark team={team} size="lg" />
            <span className="home-team-card__label">{team.shortName}</span>
          </button>
        ))}
      </div>

      {canScroll && (
        <button
          type="button"
          className="home-team-rail__next"
          aria-label="다음 구단 보기"
          onClick={() => trackRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  )
}

function GameCard({ game }: { game: GameSummary }) {
  const { isAdmin } = useAuth()
  const bookable = game.status === 'SCHEDULED' && isBookable(game.startAt)
  const canceled = game.status === 'CANCELED'
  // 취소된 경기는 회원에게는 눌러도 소용없어 비활성으로 두지만, 관리자는 취소 처리 확인차 들어가 볼 수 있어야 한다.
  const adminCanOpenCanceled = canceled && isAdmin

  return (
    <article className="home-game">
      <div className="home-game__time">
        <strong>{formatTime(game.startAt)}</strong>
        <span>{game.stadium.name}</span>
      </div>

      <div className="home-matchup">
        <div className="home-matchup__team home-matchup__team--away">
          <span className="home-matchup__label">
            <span className="home-matchup__name">{game.awayTeam.name}</span>
            <span className="home-matchup__role">원정</span>
          </span>
          <TeamMark team={game.awayTeam} />
        </div>
        <span className="home-matchup__vs">VS</span>
        <div className="home-matchup__team">
          <TeamMark team={game.homeTeam} />
          <span className="home-matchup__label">
            <span className="home-matchup__name">{game.homeTeam.name}</span>
            <span className="home-matchup__role">홈</span>
          </span>
        </div>
      </div>

      {bookable ? (
        <Link className="home-button home-button--primary" to={`/games/${game.id}`}>
          예매하기
        </Link>
      ) : adminCanOpenCanceled ? (
        <Link className="home-button home-button--admin-canceled" to={`/games/${game.id}`}>
          경기취소
        </Link>
      ) : (
        <span className="home-button home-button--disabled" aria-disabled="true">
          {canceled ? '경기취소' : '예매 마감'}
        </span>
      )}
    </article>
  )
}
