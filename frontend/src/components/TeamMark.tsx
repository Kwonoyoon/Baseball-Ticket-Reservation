import type { CSSProperties } from 'react'
import type { Team } from '../api/types'

type TeamMarkProps = {
  team: Team
  size?: 'md' | 'lg'
}

export function TeamMark({ team, size = 'md' }: TeamMarkProps) {
  return (
    <span
      className={`team-mark team-mark--${size}`}
      style={{ '--team-color': team.primaryColor } as CSSProperties}
      aria-hidden="true"
    >
      {team.shortName}
    </span>
  )
}
