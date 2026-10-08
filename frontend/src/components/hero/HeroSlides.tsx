import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { HotGame, HotPost, RecentTransfer, Standing } from '../../api/types'
import {
  bookedPercent,
  CHALLENGE_GOAL,
  dDayLabel,
  timeLeft,
  type ChallengeInfo,
  type MyTicketInfo,
  type NextGameInfo,
  type TodayInfo,
} from '../../lib/heroData'
import { formatMonthDay, formatPrice, formatTime, isBookable, weekdayLabel } from '../../lib/format'
import { postCategoryLabel } from '../../lib/postCategory'
import { teamNameEn } from '../../lib/teamNames'
import { TeamMark } from '../TeamMark'
import { BallIllustration, EventIllustration, FieldIllustration } from './Illustrations'
import './HeroSlides.css'

const two = (value: number) => String(value).padStart(2, '0')

/** "10.08 (목) 18:30" */
const shortDateTime = (startAt: string) =>
  `${formatMonthDay(startAt.slice(0, 10))} (${weekdayLabel(startAt.slice(0, 10))}) ${formatTime(startAt)}`

/** 이 예매율(%) 이상인 경기가 있을 때만 "매진 임박"이라고 말한다. 예매가 거의 없는데 임박이라고 하면 거짓이 되기 때문이다. */
export const SOLD_OUT_SOON_PERCENT = 70

export function isSoldOutSoon(games: HotGame[]): boolean {
  return games.some((hot) => bookedPercent(hot.soldSeats, hot.totalSeats) >= SOLD_OUT_SOON_PERCENT)
}

/** 팀 색 두 개를 카드에 넘긴다. 카드 위쪽 띠와 로고 테두리가 이 색을 쓴다. */
const teamColors = (away: string, home: string) => ({ '--away': away, '--home': home }) as CSSProperties

/** 매초 갱신되는 현재 시각. 카운트다운 한 곳에서만 쓰므로 슬라이드 전체가 아니라 이 컴포넌트만 다시 그려진다. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

function SoldBar({ percent }: { percent: number }) {
  return (
    <div className="hs-bar" role="img" aria-label={`예매율 ${percent}%`}>
      <span style={{ width: `${Math.max(percent, 2)}%` }} />
    </div>
  )
}

/** 슬라이드 뒤에 깔리는 은은한 경기장 무늬와 공. 모든 슬라이드가 같은 분위기를 갖게 한다. */
function Backdrop() {
  return (
    <div className="hs-backdrop" aria-hidden="true">
      <FieldIllustration className="hs-backdrop__field" />
      <BallIllustration className="hs-backdrop__ball" />
    </div>
  )
}

/** A. 다음 경기 D-day. 마이팀이 있으면 그 구단 경기, 없으면 리그에서 가장 가까운 경기. */
export function NextGameSlide({ info }: { info: NextGameInfo }) {
  const now = useNow()
  const { game } = info
  const left = timeLeft(game.startAt, now)
  const percent = bookedPercent(info.soldSeats, info.totalSeats)
  // 마이팀이 홈인지 원정인지는 id로 가린다. (예전에는 항상 홈팀을 골라서, 마이팀이 원정이면 상대팀 일정으로 갔다)
  const favoriteTeam =
    info.favoriteTeamId === null
      ? null
      : ([game.homeTeam, game.awayTeam].find((team) => team.id === info.favoriteTeamId) ?? null)
  // 같은 화면이라 페이지를 새로 읽지 않고 주소의 ?team= 만 바꾼다. 일정 영역으로는 직접 스크롤한다.
  const scrollToSchedule = () => requestAnimationFrame(() => document.getElementById('schedule')?.scrollIntoView?.())

  return (
    <div className="hs hs--next">
      <Backdrop />
      <div className="hs-next__main">
        <span className="hs-tag">{info.forFavorite ? '♥ 내 관심 구단' : 'KBO 다음 경기'}</span>
        <div className="hs-dday">
          <strong>{dDayLabel(game.startAt, now)}</strong>
          <span>다음 경기까지</span>
        </div>
        <div className="hs-clock" role="timer" aria-label="경기까지 남은 시간">
          {(
            [
              [left.days, '일'],
              [left.hours, '시간'],
              [left.minutes, '분'],
              [left.seconds, '초'],
            ] as const
          ).map(([value, unit]) => (
            <div key={unit}>
              <strong>{two(value)}</strong>
              <span>{unit}</span>
            </div>
          ))}
        </div>
        <div className="hs-actions">
          <Link className="hs-button hs-button--primary" to={`/games/${game.id}`}>
            지금 예매하기
          </Link>
          {favoriteTeam ? (
            <Link className="hs-button" to={`/?team=${favoriteTeam.id}`} onClick={scrollToSchedule}>
              {favoriteTeam.shortName} 경기 일정 전체
            </Link>
          ) : (
            <a className="hs-button" href="#schedule">
              경기 일정 전체
            </a>
          )}
        </div>
      </div>

      <div className="hs-card hs-next__card" style={teamColors(game.awayTeam.primaryColor, game.homeTeam.primaryColor)}>
        <div className="hs-versus">
          {(
            [
              [game.homeTeam, 'HOME'],
              [game.awayTeam, 'AWAY'],
            ] as const
          ).map(([team, side], index) => (
            <div key={side} className="hs-versus__team">
              {index === 1 && <span className="hs-versus__vs">VS</span>}
              <TeamMark team={team} size="lg" />
              <strong>{teamNameEn(team)}</strong>
              <small>{side}</small>
            </div>
          ))}
        </div>
        <div className="hs-meta">
          <b>{shortDateTime(game.startAt)}</b>
          <span>{game.stadium.name}</span>
        </div>
        {info.totalSeats > 0 && (
          <>
            <SoldBar percent={percent} />
            <div className="hs-meta hs-meta--small">
              <span>예매율 {percent}%</span>
              <span>잔여 {(info.totalSeats - info.soldSeats).toLocaleString('ko-KR')}석</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** B. 내 티켓. 로그인했고 앞으로 볼 예매가 있을 때만 나온다. */
export function MyTicketSlide({ info, name, now }: { info: MyTicketInfo; name: string; now: Date }) {
  const { reservation, stats } = info
  const { game } = reservation
  const dDay = dDayLabel(game.startAt, now)
  const first = reservation.seats[0]
  const more = reservation.seats.length - 1
  const record = stats.decided > 0 ? `${stats.wins}승 ${stats.losses}패` : '-'

  return (
    <div className="hs hs--ticket">
      <Backdrop />
      <div className="hs-ticket__main">
        <span className="hs-tag">MY TICKET</span>
        <h2 className="hs-title">
          {name}님,
          <br />
          <em>곧 직관</em> 가시네요!
        </h2>
        <p className="hs-sub">
          {dDay === 'D-DAY' ? '오늘' : `${dDay.slice(2)}일 뒤`} 경기가 있어요. 예매 내역에서 좌석 위치를 미리
          확인하세요.
        </p>
        <dl className="hs-stats">
          <div>
            <dt>올해 직관</dt>
            <dd>{info.attendedThisYear}</dd>
          </div>
          <div>
            <dt>직관 전적</dt>
            <dd>{record}</dd>
          </div>
          <div>
            <dt>보유 티켓</dt>
            <dd>{info.heldSeats}</dd>
          </div>
        </dl>
        <div className="hs-actions">
          <Link className="hs-button hs-button--primary" to="/my/reservations">
            내 예매내역 보기
          </Link>
        </div>
      </div>

      <div className="hs-paper" style={teamColors(game.awayTeam.primaryColor, game.homeTeam.primaryColor)}>
        <div className="hs-paper__head">
          <span>2026 KBO 정규시즌</span>
          <b>{dDay}</b>
        </div>
        <div className="hs-paper__match">
          <strong>{game.awayTeam.shortName}</strong>
          <i>vs</i>
          <strong>{game.homeTeam.shortName}</strong>
        </div>
        <p className="hs-paper__info">
          {shortDateTime(game.startAt)} · {game.stadium.name}
        </p>
        <div className="hs-paper__seat">
          <div>
            <small>구역</small>
            <b>{first?.sectionName ?? '-'}</b>
          </div>
          <div>
            <small>좌석</small>
            <b>
              {first ? `${first.rowNo}열 · ${first.seatNo}번` : '-'}
              {more > 0 && ` 외 ${more}석`}
            </b>
          </div>
        </div>
        <Link className="hs-paper__link" to={`/reservations/${reservation.id}`}>
          예매 상세 보기 ›
        </Link>
      </div>
    </div>
  )
}

/**
 * C. 예매율이 높은 경기. 70% 이상이 있을 때만 "매진 임박"이고, 아니면 "이번 주 인기 경기"로 말한다.
 * (샘플 데이터처럼 예매가 거의 없는데 "자리가 얼마 안 남았어요"라고 하면 사실과 다르기 때문이다)
 */
export function HotGamesSlide({ games }: { games: HotGame[] }) {
  const soon = isSoldOutSoon(games)
  return (
    <div className="hs hs--hot">
      <Backdrop />
      <div className="hs-hot__head">
        <span className="hs-tag">{soon ? '🔥 매진 임박' : '⚾ 이번 주 인기 경기'}</span>
        <h2 className="hs-title hs-title--row">
          {soon ? (
            <>
              서두르세요, <em>자리가 얼마 안 남았어요</em>
            </>
          ) : (
            <>
              지금 예매할 수 있는 <em>가까운 경기</em>예요
            </>
          )}
        </h2>
        <p className="hs-sub">
          {soon ? '예매율이 높은 경기를 먼저 보여 드려요.' : '예매율이 높은 순서로 골랐어요.'} 좌석은 선점한 뒤 결제까지
          제한 시간이 있어요.
        </p>
      </div>
      <ul className="hs-cards">
        {games.map(({ game, soldSeats, totalSeats }) => {
          const percent = bookedPercent(soldSeats, totalSeats)
          const hot = percent >= SOLD_OUT_SOON_PERCENT
          return (
            <li
              key={game.id}
              className="hs-card hs-hot"
              style={teamColors(game.awayTeam.primaryColor, game.homeTeam.primaryColor)}
            >
              <div className="hs-hot__top">
                <span className={`hs-chip ${hot ? 'hs-chip--hot' : 'hs-chip--ok'}`}>
                  {hot ? '마감 임박' : '예매 중'}
                </span>
                <span>{shortDateTime(game.startAt)}</span>
              </div>
              <div className="hs-hot__teams">
                <div>
                  <TeamMark team={game.awayTeam} />
                  <b>{game.awayTeam.shortName}</b>
                </div>
                <span>VS</span>
                <div>
                  <TeamMark team={game.homeTeam} />
                  <b>{game.homeTeam.shortName}</b>
                </div>
              </div>
              <p className="hs-hot__stadium">{game.stadium.name}</p>
              <SoldBar percent={percent} />
              <div className="hs-meta hs-meta--small">
                <span>예매율 {percent}%</span>
                <span>잔여 {(totalSeats - soldSeats).toLocaleString('ko-KR')}석</span>
              </div>
              <Link className="hs-button hs-button--primary hs-button--block" to={`/games/${game.id}`}>
                예매하기
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * 사이트 자체 이벤트: 직관 챌린지. 이번 달에 3경기를 직관하면 '직관 요정' 뱃지를 준다는 설정이다.
 * 로그인하면 이번 달에 몇 경기를 직관했는지(캘린더 기록 기준)를 공으로 채워 보여 주고, 아니면 참여를 안내한다.
 */
export function EventSlide({ challenge }: { challenge: ChallengeInfo }) {
  const done = challenge ? Math.min(challenge.attendedThisMonth, CHALLENGE_GOAL) : 0
  const complete = challenge !== null && challenge.attendedThisMonth >= CHALLENGE_GOAL

  return (
    <div className="hs hs--event">
      <div className="hs-event__main">
        <span className="hs-tag hs-tag--gold">🏆 SAFETICKET 이벤트</span>
        <h2 className="hs-title">
          직관 챌린지,
          <br />
          이번 달 <em>{CHALLENGE_GOAL}경기</em> 직관하면
          <br />
          <em>'직관 요정'</em> 뱃지!
        </h2>
        <p className="hs-sub">
          경기를 예매하고 직관하면 캘린더에 기록돼요. 이번 달 안에 {CHALLENGE_GOAL}경기를 채워 보세요.
        </p>
        <div className="hs-balls" role="img" aria-label={`이번 달 직관 ${done} / ${CHALLENGE_GOAL}경기`}>
          {Array.from({ length: CHALLENGE_GOAL }, (_, index) => (
            <span key={index} className={index < done ? 'is-done' : undefined}>
              <BallIllustration />
            </span>
          ))}
          <b>
            {challenge ? `${done} / ${CHALLENGE_GOAL}` : `0 / ${CHALLENGE_GOAL}`}
            <small>{complete ? '달성! 🎉' : challenge ? '직관한 경기' : '로그인하고 참여'}</small>
          </b>
        </div>
        <div className="hs-actions">
          {challenge ? (
            <a className="hs-button hs-button--primary" href="#schedule">
              {complete ? '다음 경기 보러 가기' : '경기 예매하러 가기'}
            </a>
          ) : (
            <Link className="hs-button hs-button--primary" to="/login">
              로그인하고 참여하기
            </Link>
          )}
        </div>
      </div>
      <EventIllustration className="hs-art" />
    </div>
  )
}

/** 경기 한 줄의 오른쪽 상태 표시 */
function gameStatus(game: TodayInfo['games'][number]): string {
  if (game.status === 'FINISHED') return '종료'
  if (game.status === 'CANCELED') return '취소'
  return isBookable(game.startAt) ? '예매 가능' : '경기 전'
}

/** D. 오늘의 KBO와 구단 순위 TOP 5 */
export function TodaySlide({ today, standings }: { today: TodayInfo | null; standings: Standing[] }) {
  const top = standings.slice(0, 5)
  // 결과가 입력된 경기가 하나도 없으면 순위가 모두 0승 0패라서 보여 줄 것이 없다.
  const hasRecords = top.some((standing) => standing.wins + standing.losses > 0)

  return (
    <div className="hs hs--today">
      <Backdrop />
      {today && (
        <section className="hs-panel" aria-label="오늘의 KBO">
          <header>
            <h2>오늘의 KBO</h2>
            <small>
              {formatMonthDay(today.date)} ({weekdayLabel(today.date)})
            </small>
            <span>{today.games.length}경기</span>
          </header>
          <ul className="hs-games">
            {today.games.slice(0, 5).map((game) => (
              <li key={game.id}>
                <time>{formatTime(game.startAt)}</time>
                <span className="hs-games__team">
                  <TeamMark team={game.awayTeam} />
                  {game.awayTeam.shortName}
                </span>
                <b>
                  {game.status === 'FINISHED' && game.awayScore !== null && game.homeScore !== null
                    ? `${game.awayScore} : ${game.homeScore}`
                    : 'vs'}
                </b>
                <span className="hs-games__team hs-games__team--home">
                  {game.homeTeam.shortName}
                  <TeamMark team={game.homeTeam} />
                </span>
                <em className={`hs-chip${gameStatus(game) === '예매 가능' ? ' hs-chip--ok' : ''}`}>
                  {gameStatus(game)}
                </em>
              </li>
            ))}
          </ul>
          <a className="hs-button hs-button--primary" href="#schedule">
            경기 일정 전체 보기
          </a>
        </section>
      )}

      <section className="hs-panel" aria-label="구단 순위">
        <header>
          <h2>구단 순위</h2>
          <span>TOP 5</span>
        </header>
        {hasRecords ? (
          <ol className="hs-rank">
            {top.map((standing) => (
              <li key={standing.team.id}>
                <b>{standing.rank}</b>
                <TeamMark team={standing.team} />
                <span>{standing.team.name}</span>
                <small>{standing.winPct.toFixed(3).replace(/^0/, '')}</small>
                <em>{standing.gamesBehind === 0 ? '-' : standing.gamesBehind}</em>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hs-empty">아직 순위를 집계할 경기 결과가 없어요.</p>
        )}
      </section>
    </div>
  )
}

/** E. 지금 뜨는 커뮤니티와 방금 올라온 티켓 양도 */
export function CommunitySlide({ posts, transfers }: { posts: HotPost[]; transfers: RecentTransfer[] }) {
  return (
    <div className="hs hs--community">
      <Backdrop />
      <section className="hs-panel" aria-label="지금 뜨는 커뮤니티">
        <header>
          <h2>지금 뜨는 커뮤니티</h2>
          <Link to="/community">더 보기 ›</Link>
        </header>
        {posts.length === 0 ? (
          <p className="hs-empty">아직 좋아요를 받은 글이 없어요.</p>
        ) : (
          <ul className="hs-feed">
            {posts.map((post) => (
              <li key={post.id}>
                <Link to={`/community/${post.team.id}/posts/${post.id}`}>
                  <TeamMark team={post.team} />
                  <span className="hs-feed__body">
                    <b>
                      <em className="hs-chip">{postCategoryLabel(post.category ?? undefined)}</em>
                      {post.title}
                    </b>
                    <small>
                      {post.team.name} · 댓글 {post.commentCount}
                    </small>
                  </span>
                  <span className="hs-feed__likes">♥ {post.likeCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hs-panel" aria-label="방금 올라온 티켓 양도">
        <header>
          <h2>방금 올라온 티켓 양도</h2>
          <Link to="/transfers">양도 마켓 ›</Link>
        </header>
        {transfers.length === 0 ? (
          <p className="hs-empty">아직 올라온 양도글이 없어요.</p>
        ) : (
          <ul className="hs-feed">
            {transfers.map((transfer) => (
              <li key={transfer.id}>
                <Link to="/transfers">
                  <TeamMark team={transfer.game.homeTeam} />
                  <span className="hs-feed__body">
                    <b>
                      <em className="hs-chip hs-chip--ok">NEW</em>
                      {transfer.game.awayTeam.shortName} vs {transfer.game.homeTeam.shortName}
                      {transfer.sectionName && ` · ${transfer.sectionName}`}
                      {transfer.seatCount > 1 && ` ${transfer.seatCount}연석`}
                    </b>
                    <small>
                      {shortDateTime(transfer.game.startAt)} · {transfer.game.stadium.name}
                    </small>
                  </span>
                  <span className="hs-feed__price">
                    정가 양도
                    <b>{formatPrice(transfer.price)}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
