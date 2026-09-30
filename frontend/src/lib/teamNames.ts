import type { Team } from '../api/types'

/**
 * 구단 이름 표시용 매핑. 앞부분(LG, 두산처럼 원래 표기)은 team.name에서 그대로 가져오고,
 * 뒤에 붙는 마스코트 이름만 영어로 바꾼다(트윈스 -> Twins, 베어스 -> Bears).
 */
const MASCOT_EN: Record<string, string> = {
  LG: 'Twins',
  DOOSAN: 'Bears',
  KIWOOM: 'Heroes',
  SSG: 'Landers',
  KT: 'Wiz',
  HANWHA: 'Eagles',
  SAMSUNG: 'Lions',
  KIA: 'Tigers',
  NC: 'Dinos',
  LOTTE: 'Giants',
}

/** 매핑에 없는 구단(코드가 새로 추가된 경우 등)은 원래 이름을 그대로 보여준다. */
export function teamNameEn(team: Team): string {
  const mascot = MASCOT_EN[team.code]
  if (!mascot) return team.name
  const [front] = team.name.split(' ')
  return `${front} ${mascot}`
}
