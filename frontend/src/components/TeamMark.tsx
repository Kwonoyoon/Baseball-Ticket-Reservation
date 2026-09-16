import type { CSSProperties } from 'react'
import type { Team } from '../api/types'
import { teamLogo } from '../lib/teamLogos'

type TeamMarkProps = {
  team: Team
  size?: 'md' | 'lg'
}

export function TeamMark({ team, size = 'md' }: TeamMarkProps) {
  const logo = teamLogo(team.code)

  return (
    <span
      className={`team-mark team-mark--${size}${logo ? ' team-mark--logo' : ''}`}
      style={{ '--team-color': team.primaryColor } as CSSProperties}
      aria-hidden="true"
    >
      {/* 로고가 없는 구단은 약칭으로 대신한다. */}
      {logo ? <img className="team-mark__logo" src={logo} alt="" /> : team.shortName}
    </span>
  )
}
