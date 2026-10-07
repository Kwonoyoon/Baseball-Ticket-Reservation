import { api } from '../api/endpoints'
import type { GameSummary, HotGame, HotPost, RecentTransfer, Reservation, Standing } from '../api/types'
import { attendanceStats, type AttendanceStats } from './attendance'
import { attendedGames, countInMonth } from './calendar'
import { addDays, parseSeoulDateTime, todayInSeoul } from './format'

/** 다음 경기를 찾아볼 최대 일수. 휴식일(월요일)과 우천 취소를 건너뛰기에 충분하다. */
const NEXT_GAME_LOOKAHEAD_DAYS = 14

/** 오늘 경기가 없을 때 다음 경기일을 찾아볼 최대 일수 */
const TODAY_LOOKAHEAD_DAYS = 3

/** 매진 임박·뜨는 글·최근 양도글에 보여 줄 개수 */
const HOT_GAME_COUNT = 3
const HOT_POST_COUNT = 4
const RECENT_TRANSFER_COUNT = 3

export type NextGameInfo = {
  game: GameSummary
  soldSeats: number
  totalSeats: number
  /** 마이팀의 경기인지. false면 전체 리그에서 가장 가까운 경기다. */
  forFavorite: boolean
}

export type MyTicketInfo = {
  /** 가장 가까운 예매 */
  reservation: Reservation
  /** 올해 직관한 경기 수 */
  attendedThisYear: number
  stats: AttendanceStats
  /** 아직 보지 않은 예매의 좌석 수 합계 */
  heldSeats: number
}

export type TodayInfo = { date: string; games: GameSummary[] }

/** 직관 챌린지(사이트 자체 이벤트): 이번 달에 직관한 경기 수. 로그인하지 않았으면 null이다. */
export type ChallengeInfo = { attendedThisMonth: number } | null

/** 이번 달에 몇 경기를 직관하면 챌린지를 달성하는지 */
export const CHALLENGE_GOAL = 3

export type HeroData = {
  nextGame: NextGameInfo | null
  myTicket: MyTicketInfo | null
  challenge: ChallengeInfo
  hotGames: HotGame[]
  today: TodayInfo | null
  standings: Standing[]
  hotPosts: HotPost[]
  transfers: RecentTransfer[]
}

export const EMPTY_HERO_DATA: HeroData = {
  nextGame: null,
  myTicket: null,
  challenge: null,
  hotGames: [],
  today: null,
  standings: [],
  hotPosts: [],
  transfers: [],
}

/** 슬라이드 하나가 실패해도 나머지는 그려야 하므로, 실패하면 fallback을 돌려준다. (중단 신호는 그대로 던진다) */
async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    return fallback
  }
}

/** 오늘부터 차례로 보며 아직 시작하지 않은 첫 경기를 찾는다. teamId가 있으면 그 구단 경기만. */
async function findNextGame(teamId: number | null, signal: AbortSignal, now: Date): Promise<GameSummary | null> {
  const today = todayInSeoul(now)
  for (let offset = 0; offset < NEXT_GAME_LOOKAHEAD_DAYS; offset += 1) {
    const games = await api.getSchedule(addDays(today, offset), teamId, signal)
    const upcoming = games.find((game) => game.status === 'SCHEDULED' && parseSeoulDateTime(game.startAt) > now)
    if (upcoming) return upcoming
  }
  return null
}

async function loadNextGame(
  favoriteTeamId: number | null,
  signal: AbortSignal,
  now: Date,
): Promise<NextGameInfo | null> {
  // 마이팀이 있으면 그 구단의 다음 경기, 없거나 찾지 못하면 리그 전체에서 가장 가까운 경기
  let forFavorite = false
  let game: GameSummary | null = null
  if (favoriteTeamId !== null) {
    game = await findNextGame(favoriteTeamId, signal, now)
    forFavorite = game !== null
  }
  if (game === null) game = await findNextGame(null, signal, now)
  if (game === null) return null

  const found = game
  const summary = await safely(() => api.getSeatSummary(found.id, signal), null)
  const totalSeats = summary?.sections.reduce((sum, section) => sum + section.totalSeats, 0) ?? 0
  const soldSeats = summary?.sections.reduce((sum, section) => sum + section.soldSeats, 0) ?? 0
  return { game: found, soldSeats, totalSeats, forFavorite }
}

/** 로그인한 회원의 예매 목록을 한 번 받아 내 티켓 슬라이드와 직관 챌린지를 함께 만든다. */
async function loadMemberData(
  favoriteTeamId: number | null,
  signal: AbortSignal,
  now: Date,
): Promise<{ myTicket: MyTicketInfo | null; challenge: ChallengeInfo }> {
  const reservations = await api.getMyReservations(signal)
  const attended = attendedGames(reservations, now)
  const challenge: ChallengeInfo = {
    attendedThisMonth: countInMonth(
      attended,
      Number(todayInSeoul(now).slice(0, 4)),
      Number(todayInSeoul(now).slice(5, 7)),
    ),
  }

  const upcoming = reservations
    .filter((reservation) => reservation.status === 'CONFIRMED' && parseSeoulDateTime(reservation.game.startAt) > now)
    .sort((a, b) => a.game.startAt.localeCompare(b.game.startAt))
  if (upcoming.length === 0) return { myTicket: null, challenge }

  const year = String(now.getFullYear())
  let attendedThisYear = 0
  for (const [date, onDate] of attended) {
    if (date.startsWith(year)) attendedThisYear += onDate.length
  }
  return {
    challenge,
    myTicket: {
      reservation: upcoming[0],
      attendedThisYear,
      stats: attendanceStats(reservations, favoriteTeamId),
      heldSeats: upcoming.reduce((sum, reservation) => sum + reservation.seats.length, 0),
    },
  }
}

/** 오늘 경기를 찾고, 휴식일이면 가까운 다음 경기일로 넘어간다. */
async function loadToday(signal: AbortSignal, now: Date): Promise<TodayInfo | null> {
  const today = todayInSeoul(now)
  for (let offset = 0; offset < TODAY_LOOKAHEAD_DAYS; offset += 1) {
    const date = addDays(today, offset)
    const games = await api.getSchedule(date, null, signal)
    if (games.length > 0) return { date, games }
  }
  return null
}

/**
 * 메인 슬라이드에 필요한 데이터를 한꺼번에 불러온다. 슬라이드마다 독립이라 병렬로 부르고,
 * 하나가 실패하면 그 슬라이드만 빠진다.
 * @param favoriteTeamId 마이팀. 없으면 null
 * @param loggedIn 로그인 여부. 내 티켓 슬라이드는 로그인했을 때만 만든다.
 */
export async function loadHeroData(
  favoriteTeamId: number | null,
  loggedIn: boolean,
  signal: AbortSignal,
  now: Date = new Date(),
): Promise<HeroData> {
  const [nextGame, member, hotGames, today, standings, hotPosts, transfers] = await Promise.all([
    safely(() => loadNextGame(favoriteTeamId, signal, now), null),
    loggedIn ? safely(() => loadMemberData(favoriteTeamId, signal, now), null) : Promise.resolve(null),
    safely(() => api.getHotGames(HOT_GAME_COUNT, signal), [] as HotGame[]),
    safely(() => loadToday(signal, now), null),
    safely(() => api.getStandings(signal), [] as Standing[]),
    safely(() => api.getHotPosts(HOT_POST_COUNT, signal), [] as HotPost[]),
    safely(() => api.getRecentTransfers(RECENT_TRANSFER_COUNT, signal), [] as RecentTransfer[]),
  ])
  return {
    nextGame,
    myTicket: member?.myTicket ?? null,
    challenge: member?.challenge ?? null,
    hotGames,
    today,
    standings,
    hotPosts,
    transfers,
  }
}

/** 경기까지 남은 시간. 이미 지났으면 모두 0이다. */
export function timeLeft(startAt: string, now: Date) {
  const ms = Math.max(0, parseSeoulDateTime(startAt).getTime() - now.getTime())
  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/** D-day 표시. 경기 날짜와 오늘의 날짜 차이(달력 기준)다. 당일이면 "D-DAY". */
export function dDayLabel(startAt: string, now: Date): string {
  const gameDay = Date.parse(startAt.slice(0, 10) + 'T00:00:00Z')
  const today = Date.parse(todayInSeoul(now) + 'T00:00:00Z')
  const diff = Math.round((gameDay - today) / 86_400_000)
  return diff <= 0 ? 'D-DAY' : 'D-' + diff
}

/** 예매율(%). 좌석 정보가 없으면 0이다. */
export function bookedPercent(soldSeats: number, totalSeats: number): number {
  return totalSeats === 0 ? 0 : Math.round((soldSeats / totalSeats) * 100)
}
