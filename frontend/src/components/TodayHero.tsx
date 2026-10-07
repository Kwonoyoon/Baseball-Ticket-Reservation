import { useEffect, useMemo, useState, type FocusEvent, type ReactNode } from 'react'
import { isAbortError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { EMPTY_HERO_DATA, loadHeroData, type HeroData } from '../lib/heroData'
import { useAutoSlide } from '../lib/useAutoSlide'
import {
  CommunitySlide,
  EventSlide,
  HotGamesSlide,
  isSoldOutSoon,
  MyTicketSlide,
  NextGameSlide,
  TodaySlide,
} from './hero/HeroSlides'

type Slide = { key: string; label: string; render: (visible: boolean) => ReactNode }

/**
 * 메인 화면 맨 위 슬라이드. 3초마다 옆으로 넘어가고, 양옆 화살표와 아래 점으로 직접 넘길 수 있다.
 * 슬라이드는 데이터가 있을 때만 만든다: 다음 경기 D-day → 내 티켓(로그인) → 매진 임박·인기 경기 → 직관 챌린지 이벤트 → 오늘의 KBO·순위 →
 * 뜨는 커뮤니티·양도. 하나가 비거나 실패해도 나머지는 그대로 나온다.
 */
export function TodayHero() {
  const { member, loading: authLoading } = useAuth()
  const [data, setData] = useState<HeroData | null>(null)
  const [loadedAt, setLoadedAt] = useState(() => new Date())
  // 마우스를 올렸거나 키보드로 포커스가 안에 있으면 넘기지 않는다. 둘 중 하나만 풀려도 다시 넘기면 안 되므로 따로 든다.
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const memberId = member?.id ?? null
  const favoriteTeamId = member?.favoriteTeamId ?? null

  // 로그인 복원이 끝난 뒤에 불러온다. (복원 전에 불러오면 마이팀과 내 티켓을 모른 채 한 번 더 불러오게 된다)
  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    const now = new Date()
    loadHeroData(favoriteTeamId, memberId !== null, controller.signal, now)
      .then((result) => {
        setData(result)
        setLoadedAt(now)
      })
      .catch((e: unknown) => {
        // 슬라이드는 장식에 가까워서 실패해도 아래 일정 목록(자체 오류 표시)은 계속 쓸 수 있다.
        if (!isAbortError(e)) setData(EMPTY_HERO_DATA)
      })
    return () => controller.abort()
  }, [authLoading, memberId, favoriteTeamId])

  const slides = useMemo<Slide[]>(() => {
    if (!data) return []
    const list: Slide[] = []
    if (data.nextGame) {
      const info = data.nextGame
      list.push({ key: 'next', label: '다음 경기', render: () => <NextGameSlide info={info} /> })
    }
    if (data.myTicket && member) {
      const info = data.myTicket
      list.push({
        key: 'ticket',
        label: '내 티켓',
        render: () => <MyTicketSlide info={info} name={member.name} now={loadedAt} />,
      })
    }
    if (data.hotGames.length > 0) {
      const games = data.hotGames
      // 예매율이 높은 경기가 실제로 있을 때만 "매진 임박"이라고 부른다.
      list.push({
        key: 'hot',
        label: isSoldOutSoon(games) ? '매진 임박' : '인기 경기',
        render: () => <HotGamesSlide games={games} />,
      })
    }
    // 사이트 자체 이벤트(직관 챌린지)는 로그인 여부와 상관없이 항상 넣는다. 로그인하면 내 진행 상황이 나온다.
    const challenge = data.challenge
    list.push({ key: 'event', label: '직관 챌린지 이벤트', render: () => <EventSlide challenge={challenge} /> })
    if (data.today) {
      const today = data.today
      const standings = data.standings
      list.push({ key: 'today', label: '오늘의 KBO', render: () => <TodaySlide today={today} standings={standings} /> })
    }
    if (data.hotPosts.length > 0 || data.transfers.length > 0) {
      const { hotPosts, transfers } = data
      list.push({
        key: 'community',
        label: '커뮤니티와 양도',
        render: () => <CommunitySlide posts={hotPosts} transfers={transfers} />,
      })
    }
    return list
  }, [data, member, loadedAt])

  const { index, goTo } = useAutoSlide(slides.length, hovered || focused)

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    // 점·화살표 사이로 포커스가 옮겨 가는 동안에는 슬라이드 안에 있는 것으로 본다.
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  const empty = data !== null && slides.length === 0

  return (
    <section
      className="home-hero"
      aria-roledescription="carousel"
      aria-label="오늘의 KBO 소식"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      {/* 눈에 보이는 큰 제목은 슬라이드마다 따로 있어서, 문서 제목은 화면 낭독기용으로만 둔다. */}
      <h1 className="sr-only">Today KBO</h1>

      <div className="home-hero__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {empty && (
          <div className="home-slide home-slide--message">
            <p>지금 보여 드릴 경기 소식이 없습니다.</p>
          </div>
        )}
        {slides.map((slide, position) => (
          <div
            key={slide.key}
            className={`home-slide home-slide--${slide.key.split('-')[0]}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${position + 1} / ${slides.length} ${slide.label}`}
            aria-hidden={position !== index}
            // 보이지 않는 슬라이드의 링크와 버튼은 키보드로 잡히지 않게 한다.
            inert={position !== index}
          >
            {slide.render(position === index)}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          {/* 양옆 화살표로 이전·다음 슬라이드로 넘긴다. 맨 끝에서 다음을 누르면 처음으로, 처음에서 이전을 누르면 끝으로 돈다. */}
          <button
            type="button"
            className="home-hero__arrow home-hero__arrow--prev"
            aria-label="이전 슬라이드"
            onClick={() => goTo((index - 1 + slides.length) % slides.length)}
          />
          <button
            type="button"
            className="home-hero__arrow home-hero__arrow--next"
            aria-label="다음 슬라이드"
            onClick={() => goTo((index + 1) % slides.length)}
          />
          <div className="home-hero__dots">
            {slides.map((slide, position) => (
              <button
                key={slide.key}
                type="button"
                aria-label={slide.label}
                aria-current={position === index}
                onClick={() => goTo(position)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
