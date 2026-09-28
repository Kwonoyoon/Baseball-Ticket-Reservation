/**
 * 관심 구단 테마. 구단 대표색으로 사이트의 강조색(로고·주 버튼·선택 표시 등)을 바꾼다.
 *
 * 강조색은 흰 글자를 올린 버튼 배경으로도, 흰 배경 위의 글자색으로도 쓰이므로
 * 어떤 구단 색이든 흰색과의 대비가 기준(4.5:1) 이상이 되도록 어둡게 보정한다.
 * (예: 한화의 밝은 주황은 그대로 쓰면 버튼 글자가 안 읽힌다)
 */

/** WCAG AA 일반 텍스트 기준 */
export const MIN_CONTRAST = 4.5

export type TeamTheme = {
  /** 기본 강조색 */
  accent: string
  /** 마우스를 올렸을 때 등에 쓰는 강조색 */
  accentStrong: string
  /** 어두운 배경(메인 히어로 등) 위의 글자에 쓰는 밝은 강조색 */
  accentOnDark: string
}

export type Rgb = readonly [number, number, number]

export function parseHexColor(hex: string): Rgb | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) return null
  const value = parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG 상대 휘도 */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/** 두 색의 대비(1~21) */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/** 화면에 실제로 쓰이는 정수 색으로 맞춘다. 대비는 반올림한 이 값으로 판정해야 기준을 확실히 넘는다. */
function rounded([r, g, b]: Rgb): Rgb {
  return [Math.round(r), Math.round(g), Math.round(b)]
}

/** color를 target 쪽으로 amount(0~1)만큼 섞는다. */
function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return [
    color[0] + (target[0] - color[0]) * amount,
    color[1] + (target[1] - color[1]) * amount,
    color[2] + (target[2] - color[2]) * amount,
  ]
}

/** 흰색과의 대비가 기준 이상이 될 때까지 검정 쪽으로 조금씩 어둡게 한다. */
function ensureReadableOnWhite(color: Rgb): Rgb {
  let result = rounded(color)
  for (let step = 1; contrastRatio(result, WHITE) < MIN_CONTRAST && step <= 100; step += 1) {
    result = rounded(mix(color, BLACK, step / 100))
  }
  return result
}

/** 메인 히어로처럼 어두운 배경. 이 색과의 대비를 기준으로 밝기를 맞춘다. */
const DARK_BACKGROUND: Rgb = [16, 16, 16]

/** 어두운 배경과의 대비가 기준 이상이 될 때까지 흰색 쪽으로 조금씩 밝게 한다. */
function ensureReadableOnDark(color: Rgb): Rgb {
  let result = rounded(color)
  for (let step = 1; contrastRatio(result, DARK_BACKGROUND) < MIN_CONTRAST && step <= 100; step += 1) {
    result = rounded(mix(color, WHITE, step / 100))
  }
  return result
}

/**
 * 구단 대표색(#RRGGBB)으로 테마를 만든다. 색 형식이 틀리면 null이라 기본 강조색을 그대로 쓴다.
 * 이미 충분히 어두운 색(검정·남색 등)은 hover 때 오히려 밝게 해서 눌린 느낌이 나게 한다.
 */
export function buildTeamTheme(primaryColor: string | null | undefined): TeamTheme | null {
  const parsed = primaryColor ? parseHexColor(primaryColor) : null
  if (!parsed) return null

  const accent = ensureReadableOnWhite(parsed)
  const veryDark = luminance(accent) < 0.02
  const strong = veryDark ? mix(accent, WHITE, 0.22) : mix(accent, BLACK, 0.16)
  return { accent: toHex(accent), accentStrong: toHex(strong), accentOnDark: toHex(ensureReadableOnDark(parsed)) }
}
