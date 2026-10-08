import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatCountdown,
  formatDateTime,
  formatGameDate,
  formatPrice,
  formatRate,
  isBookable,
  seatKey,
  secondsUntil,
  todayInSeoul,
  weekdayLabel,
} from './format'

describe('format', () => {
  it('가격을 원화 형식으로 표시한다', () => {
    expect(formatPrice(45000)).toBe('45,000원')
  })

  it('브라우저 시간대와 관계없이 서울 기준 오늘 날짜를 구한다', () => {
    expect(todayInSeoul(new Date('2026-09-15T14:59:59Z'))).toBe('2026-09-15')
    expect(todayInSeoul(new Date('2026-09-15T15:00:00Z'))).toBe('2026-09-16')
  })

  it('월이 바뀌어도 날짜를 더한다', () => {
    expect(addDays('2026-09-29', 3)).toBe('2026-10-02')
  })

  it('요일과 경기 날짜를 표시한다', () => {
    expect(weekdayLabel('2026-09-15')).toBe('화')
    expect(formatGameDate('2026-09-19T17:00:00')).toBe('9월 19일 (토)')
    expect(formatDateTime('2026-09-15T09:05:30.123456')).toBe('2026.09.15 09:05')
  })

  it('서울 시각 기준으로 경기 시작 전에만 예매할 수 있다', () => {
    expect(isBookable('2026-09-15T18:30:00', new Date('2026-09-15T09:29:59Z'))).toBe(true)
    expect(isBookable('2026-09-15T18:30:00', new Date('2026-09-15T09:30:00Z'))).toBe(false)
  })

  it('예매율은 값이 작을수록 소수점을 더 보여 줘서 1% 미만이 0%로 뭉개지지 않는다', () => {
    expect(formatRate(90)).toBe('90%')
    expect(formatRate(12.4)).toBe('12%')
    expect(formatRate(3.46)).toBe('3.5%')
    expect(formatRate(0.04)).toBe('0.04%')
    expect(formatRate(0.01)).toBe('0.01%')
    expect(formatRate(0)).toBe('0%')
  })

  it('좌석 키와 선점 남은 시간을 계산한다', () => {
    expect(seatKey({ sectionId: 3, rowNo: 2, seatNo: 11 })).toBe('3-2-11')
    expect(secondsUntil('2026-09-15T00:05:00Z', Date.parse('2026-09-15T00:00:01Z'))).toBe(299)
    expect(secondsUntil('2026-09-15T00:05:00Z', Date.parse('2026-09-15T00:06:00Z'))).toBe(0)
    expect(formatCountdown(299)).toBe('04:59')
  })
})
