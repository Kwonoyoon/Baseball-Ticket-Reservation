import { useEffect, useState, type CSSProperties, type FocusEvent } from 'react'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameSummary, NewsItem } from '../api/types'
import { addDays, formatDateTime, formatGameDate, formatMonthDay, formatTime, todayInSeoul } from '../lib/format'
import { teamNameEn } from '../lib/teamNames'
import { useAutoSlide } from '../lib/useAutoSlide'
import { TeamMark } from './TeamMark'

/** 경기 슬라이드 뒤에 붙일 KBO 뉴스 수. 슬라이드가 너무 길어져 경기를 보기 전에 지루해지지 않게 적게 둔다. */
const NEWS_SLIDE_COUNT = 3

/** 오늘 경기가 없는 날(월요일 휴식일)에 다음 경기일을 찾아볼 최대 일수 */
const LOOKAHEAD_DAYS = 3

type HeroState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; date: string; games: GameSummary[] }

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

  // 뉴스는 장식이라 못 불러와도 경기 슬라이드는 그대로 쓴다.
  const [news, setNews] = useState<NewsItem[]>([])

  const games = state.status === 'ready' ? state.games : []
  const today = todayInSeoul()
  const dateLabel = state.status === 'ready' && state.date !== today ? formatMonthDay(state.date) : '오늘'
  const message =
    state.status === 'error'
      ? '경기 정보를 불러오지 못했습니다.'
      : state.status === 'ready' && games.length === 0
        ? '예정된 경기가 없습니다.'
        : null
  const newsSlides = news.slice(0, NEWS_SLIDE_COUNT)
  // 경기 → 뉴스 순서로 이어 붙인다. (메시지 슬라이드는 경기가 없을 때만 맨 앞에 나오며 번호 계산에는 포함한다)
  const slideCount = (message === null ? 0 : 1) + games.length + newsSlides.length
  const { index, goTo } = useAutoSlide(slideCount, hovered || focused)
  const newsStart = (message === null ? 0 : 1) + games.length
  const onNewsSlide = newsSlides.length > 0 && index >= newsStart

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

  useEffect(() => {
    const controller = new AbortController()
    api
      .getNews(controller.signal)
      .then(setNews)
      .catch(() => setNews([]))
    return () => controller.abort()
  }, [])

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // 점에서 점으로 포커스가 옮겨 가는 동안에는 캐러셀 안에 있는 것으로 본다.
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  return (
    <section
      className={`home-hero${onNewsSlide ? ' is-news' : ''}`}
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
        {games.map((game, gameIndex) => {
          const position = (message === null ? 0 : 1) + gameIndex
          return (
            <div
              key={game.id}
              className="home-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} / ${slideCount}`}
              aria-hidden={position !== index}
              style={
                {
                  '--away-color': game.awayTeam.primaryColor,
                  '--home-color': game.homeTeam.primaryColor,
                } as CSSProperties
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
          )
        })}
        {newsSlides.map((item, newsIndex) => {
          const position = newsStart + newsIndex
          const visible = position === index
          return (
            <div
              key={item.link}
              className={`home-slide home-slide--news${item.imageUrl ? ' has-image' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} / ${slideCount} KBO 뉴스`}
              aria-hidden={!visible}
              style={
                item.imageUrl ? ({ '--news-image': `url("${encodeURI(item.imageUrl)}")` } as CSSProperties) : undefined
              }
            >
              <a
                className="home-news"
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={visible ? undefined : -1}
              >
                <span className="home-news__tag">KBO 뉴스 · {item.source}</span>
                <strong className="home-news__title">{item.title}</strong>
                <span className="home-news__meta">
                  {item.publishedAt ? `${formatDateTime(item.publishedAt)} · ` : ''}기사 보기 ↗
                </span>
              </a>
            </div>
          )
        })}
      </div>

      <div className="home-hero__shade" />

      {slideCount > 1 && (
        <div className="home-hero__dots">
          {games.map((game, gameIndex) => {
            const position = (message === null ? 0 : 1) + gameIndex
            return (
              <button
                key={game.id}
                type="button"
                aria-label={`${teamNameEn(game.awayTeam)} 대 ${teamNameEn(game.homeTeam)}`}
                aria-current={position === index}
                onClick={() => goTo(position)}
              />
            )
          })}
          {newsSlides.map((item, newsIndex) => (
            <button
              key={item.link}
              type="button"
              aria-label={`KBO 뉴스: ${item.title}`}
              aria-current={newsStart + newsIndex === index}
              onClick={() => goTo(newsStart + newsIndex)}
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
