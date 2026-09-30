import type { CSSProperties } from 'react'
import type { Team } from '../api/types'
import { COMMUNITY_INTRO_MS } from '../lib/communityIntro'
import { teamEnglishName } from '../lib/teamEnglishNames'

/** 한 벌에 이름을 이만큼 되풀이한다. 가장 짧은 이름(KT WIZ)도 한 벌이 띠 최대 폭보다 넓도록. */
const REPEAT = 12
/** 글자 하나(구분점 몫 포함)가 지나가는 데 드는 초. 이름 길이가 달라도 흐르는 속도가 비슷하게 한 바퀴 시간을 정한다. */
const SEC_PER_CHAR = 0.24

/**
 * 구단 줄 아래 띠. 보고 있는 구단 색 바탕에 영어 이름이 오른쪽에서 왼쪽으로 흐른다.
 * 같은 한 벌을 두 번 이어 붙이고 절반만큼 옮긴 뒤 처음으로 돌아가, 이음매 없이 계속 흐른다.
 * 처음 그려질 때(구단이 바뀔 때마다) 오른쪽에서 왼쪽으로 펼쳐지고, 펼쳐지는 앞쪽 끝을 야구공이 굴러간다.
 * 구단 이름은 화면 낭독기용 게시판 제목에 있으므로 띠는 읽히지 않게 둔다.
 */
export function TeamBanner({ team }: { team: Team }) {
  const name = teamEnglishName(team.code)
  const half = Array.from({ length: REPEAT }, (_, i) => (
    <span key={i} className="team-banner__item">
      {name}
    </span>
  ))

  return (
    <div
      className="team-banner-wrap"
      style={
        {
          '--team-color': team.primaryColor,
          '--banner-duration': `${(name.length + 4) * REPEAT * SEC_PER_CHAR}s`,
          '--intro-ms': `${COMMUNITY_INTRO_MS}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="team-banner">
        <div className="team-banner__track">
          <div className="team-banner__half">{half}</div>
          <div className="team-banner__half">{half}</div>
        </div>
      </div>
      <Baseball />
    </div>
  )
}

/** 띠가 펼쳐지는 앞쪽 끝을 굴러가는 야구공 */
function Baseball() {
  return (
    <svg className="team-banner__ball" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="#ffffff" stroke="#d9d9d9" strokeWidth="1.5" />
      <path
        d="M9.5 4.5c3.2 3 4.8 7 4.8 11.5s-1.6 8.5-4.8 11.5M22.5 4.5c-3.2 3-4.8 7-4.8 11.5s1.6 8.5 4.8 11.5"
        fill="none"
        stroke="#d6343a"
        strokeWidth="1.6"
        strokeDasharray="2.2 1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
