import type { PaymentMethod, ReservationStatus, SeatPosition } from '../api/types'

const SEOUL_TIME_ZONE = 'Asia/Seoul'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 백엔드 ticketing.seat-hold.max-seats 와 같은 값 */
export const MAX_SEATS = 4

export const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'KAKAO_PAY', 'TOSS_PAY']

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '신용/체크카드',
  KAKAO_PAY: '카카오페이',
  TOSS_PAY: '토스페이',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: '결제 대기',
  CONFIRMED: '예매 완료',
  CANCELED: '취소됨',
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`
}

function parseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

/** 브라우저 시간대와 관계없이 서울 기준 오늘 날짜(YYYY-MM-DD)를 구한다. */
export function todayInSeoul(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function weekdayLabel(date: string): string {
  const { year, month, day } = parseDate(date)
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

export function formatMonthDay(date: string): string {
  const { month, day } = parseDate(date)
  return `${month}.${day}`
}

/** "2026-09-19T17:00:00" → "9월 19일 (토)" */
export function formatGameDate(localDateTime: string): string {
  const date = localDateTime.slice(0, 10)
  const { month, day } = parseDate(date)
  return `${month}월 ${day}일 (${weekdayLabel(date)})`
}

export function formatTime(localDateTime: string): string {
  return localDateTime.slice(11, 16)
}

export function formatDateTime(localDateTime: string): string {
  return `${localDateTime.slice(0, 10).replaceAll('-', '.')} ${formatTime(localDateTime)}`
}

/** 시간대 정보 없는 서울 기준 날짜/시각 문자열을 Date로 바꾼다. */
export function parseSeoulDateTime(localDateTime: string): Date {
  return new Date(`${localDateTime.slice(0, 19)}+09:00`)
}

export function isBookable(startAt: string, now: Date = new Date()): boolean {
  return parseSeoulDateTime(startAt).getTime() > now.getTime()
}

export function seatKey(seat: SeatPosition): string {
  return `${seat.sectionId}-${seat.rowNo}-${seat.seatNo}`
}

export function sectionIdOfSeatKey(key: string): number {
  return Number(key.split('-')[0])
}

export function secondsUntil(isoInstant: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(isoInstant).getTime() - now) / 1000))
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
