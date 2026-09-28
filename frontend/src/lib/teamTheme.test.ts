import { describe, expect, it } from 'vitest'
import { MIN_CONTRAST, WHITE, buildTeamTheme, contrastRatio, parseHexColor } from './teamTheme'

/** backend/src/main/resources/db/migration/V2__seed_reference_data.sql의 구단 대표색 */
const TEAM_COLORS: Record<string, string> = {
  LG: '#C30452',
  DOOSAN: '#131230',
  KIWOOM: '#820024',
  SSG: '#CE0E2D',
  KT: '#000000',
  HANWHA: '#FC4E00',
  SAMSUNG: '#074CA1',
  KIA: '#EA0029',
  NC: '#315288',
  LOTTE: '#041E42',
}

const ratioOnWhite = (hex: string) => contrastRatio(parseHexColor(hex)!, WHITE)

describe('buildTeamTheme', () => {
  it.each(Object.entries(TEAM_COLORS))('%s: 강조색과 hover 색 모두 흰 글자와 대비가 기준 이상이다', (_code, color) => {
    const theme = buildTeamTheme(color)!

    expect(ratioOnWhite(theme.accent)).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(ratioOnWhite(theme.accentStrong)).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })

  it('이미 충분히 어두운 색은 그대로 쓴다', () => {
    expect(buildTeamTheme('#131230')!.accent).toBe('#131230')
  })

  it('한화처럼 밝은 색은 읽히도록 어둡게 보정하되 원래 색 계열을 유지한다', () => {
    const theme = buildTeamTheme('#FC4E00')!
    const [r, g, b] = parseHexColor(theme.accent)!

    expect(theme.accent).not.toBe('#fc4e00')
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('검정처럼 아주 어두운 색은 hover 때 밝아진다', () => {
    const theme = buildTeamTheme('#000000')!

    expect(theme.accent).toBe('#000000')
    expect(theme.accentStrong).not.toBe('#000000')
    expect(parseHexColor(theme.accentStrong)![0]).toBeGreaterThan(0)
  })

  it('색 형식이 틀리거나 없으면 null이다', () => {
    expect(buildTeamTheme(null)).toBeNull()
    expect(buildTeamTheme(undefined)).toBeNull()
    expect(buildTeamTheme('red')).toBeNull()
    expect(buildTeamTheme('#12345')).toBeNull()
  })
})
