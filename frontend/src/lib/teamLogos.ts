import doosan from '../../image/dusan_logo.svg'
import hanwha from '../../image/hanwha_logo.svg'
import kia from '../../image/kia_logo.svg'
import kiwoom from '../../image/kiwoom_logo.svg'
import kt from '../../image/kt_logo.svg'
import lg from '../../image/lg_logo.svg'
import lotte from '../../image/lotte_logo.svg'
import nc from '../../image/nc_logo.svg'
import samsung from '../../image/samsung_logo.svg'
import ssg from '../../image/ssg_logo.svg'

/** 구단 코드로 찾는 로고. 새 구단이 생기면 frontend/image에 파일을 넣고 여기에 한 줄 추가한다. */
const TEAM_LOGOS: Record<string, string> = {
  LG: lg,
  DOOSAN: doosan,
  KIWOOM: kiwoom,
  SSG: ssg,
  KT: kt,
  HANWHA: hanwha,
  SAMSUNG: samsung,
  KIA: kia,
  NC: nc,
  LOTTE: lotte,
}

/** 로고가 없는 구단은 undefined. 이 경우 약칭을 대신 보여준다. */
export function teamLogo(code: string): string | undefined {
  return TEAM_LOGOS[code]
}
