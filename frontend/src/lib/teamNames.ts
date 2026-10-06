import type { Team } from '../api/types'

/** 구단 영문 이름. 화면 표시용 매핑이다 — team.name(한글, 백엔드 시드 데이터)은 그대로 두고 메인·커뮤니티 화면에서만 이 값을 쓴다. */
const TEAM_NAME_EN: Record<string, string> = {
  LG: 'LG Twins',
  DOOSAN: 'Doosan Bears',
  KIWOOM: 'Kiwoom Heroes',
  SSG: 'SSG Landers',
  KT: 'KT Wiz',
  HANWHA: 'Hanwha Eagles',
  SAMSUNG: 'Samsung Lions',
  KIA: 'KIA Tigers',
  NC: 'NC Dinos',
  LOTTE: 'Lotte Giants',
}

/** 매핑에 없는 구단(코드가 새로 추가된 경우 등)은 원래 이름을 그대로 보여준다. */
export function teamNameEn(team: Team): string {
  return TEAM_NAME_EN[team.code] ?? team.name
}
