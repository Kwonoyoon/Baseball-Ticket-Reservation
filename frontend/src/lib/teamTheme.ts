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
  let result = color
  for (let step = 1; contrastRatio(result, WHITE) < MIN_CONTRAST && step <= 100; step += 1) {
    result = mix(color, BLACK, step / 100)
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
  return { accent: toHex(accent), accentStrong: toHex(strong) }
}
