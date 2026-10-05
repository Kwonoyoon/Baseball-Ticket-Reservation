/** 구단 코드로 찾는 영어 이름(대문자). 새 구단이 생기면 여기에 한 줄 추가한다. */
const TEAM_ENGLISH_NAMES: Record<string, string> = {
  LG: 'LG TWINS',
  DOOSAN: 'DOOSAN BEARS',
  KIWOOM: 'KIWOOM HEROES',
  SSG: 'SSG LANDERS',
  KT: 'KT WIZ',
  HANWHA: 'HANWHA EAGLES',
  SAMSUNG: 'SAMSUNG LIONS',
  KIA: 'KIA TIGERS',
  NC: 'NC DINOS',
  LOTTE: 'LOTTE GIANTS',
}

/** 영어 이름이 없는 구단은 구단 코드를 그대로 쓴다. */
export function teamEnglishName(code: string): string {
  return TEAM_ENGLISH_NAMES[code] ?? code.toUpperCase()
}
