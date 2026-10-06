import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { HotGame, HotPost, RecentTransfer, Standing } from '../../api/types'
import {
  bookedPercent,
  dDayLabel,
  timeLeft,
  type MyTicketInfo,
  type NextGameInfo,
  type TodayInfo,
} from '../../lib/heroData'
import { formatMonthDay, formatPrice, formatTime, isBookable, weekdayLabel } from '../../lib/format'
import { postCategoryLabel } from '../../lib/postCategory'
import { teamNameEn } from '../../lib/teamNames'
import { TeamMark } from '../TeamMark'
import './HeroSlides.css'

const two = (value: number) => String(value).padStart(2, '0')

/** "10.08 (목) 18:30" */
const shortDateTime = (startAt: string) =>
  `${formatMonthDay(startAt.slice(0, 10))} (${weekdayLabel(startAt.slice(0, 10))}) ${formatTime(startAt)}`

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
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

/** A. 다음 경기 D-day. 마이팀이 있으면 그 구단 경기, 없으면 리그에서 가장 가까운 경기. */
export function NextGameSlide({ info }: { info: NextGameInfo }) {
  const now = useNow()
  const { game } = info
  const left = timeLeft(game.startAt, now)
  const percent = bookedPercent(info.soldSeats, info.totalSeats)
  const favoriteTeam = [game.homeTeam, game.awayTeam].find((team) => info.forFavorite && team)
  // 마이팀 경기면 그 구단을, 아니면 리그 전체를 안내한다.
  const scheduleHref = info.forFavorite ? `/?team=${favoriteTeam?.id ?? ''}#schedule` : '#schedule'

  return (
    <div className="hs hs--next">
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
          <a className="hs-button" href={scheduleHref}>
            {info.forFavorite ? `${favoriteTeam?.shortName ?? ''} 경기 일정 전체` : '경기 일정 전체'}
          </a>
        </div>
      </div>

      <div className="hs-card hs-next__card">
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
          <span>{shortDateTime(game.startAt)}</span>
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

      <div className="hs-paper">
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

/** C. 매진 임박: 예매율이 높은 경기 */
export function HotGamesSlide({ games }: { games: HotGame[] }) {
  return (
    <div className="hs hs--hot">
      <span className="hs-tag">🔥 매진 임박</span>
      <h2 className="hs-title hs-title--row">
        서두르세요, <em>자리가 얼마 안 남았어요</em>
      </h2>
      <p className="hs-sub">예매율이 높은 경기를 먼저 보여 드려요. 좌석은 선점한 뒤 결제까지 제한 시간이 있어요.</p>
      <ul className="hs-cards">
        {games.map(({ game, soldSeats, totalSeats }) => {
          const percent = bookedPercent(soldSeats, totalSeats)
          return (
            <li key={game.id} className="hs-card hs-hot">
              <div className="hs-hot__top">
                <span className="hs-chip hs-chip--hot">잔여 {100 - percent}%</span>
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
