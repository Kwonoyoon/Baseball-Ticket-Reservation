import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { Team } from '../api/types'
import { teamLogo } from '../lib/teamLogos'
import { teamNameEn } from '../lib/teamNames'

type TeamPickerProps = {
  teams: Team[]
  favoriteTeam: Team | null
  selectedTeamId: number | null
  onSelect: (teamId: number) => void
  /** 마이팀을 정하러 가는 곳 (비회원은 로그인 화면을 거친다) */
  favoriteSettingPath: string
}

function Logo({ team }: { team: Team }) {
  const logo = teamLogo(team.code)
  return <span className="team-picker__logo">{logo ? <img src={logo} alt="" /> : team.shortName}</span>
}

/**
 * 커뮤니티 위쪽 구단 영역.
 * 마이팀이 있으면 그 구단 하나만 보여 준다. (다른 구단 글은 주소로 들어왔을 때만 보이고, 이때는 돌아가는 버튼을 둔다)
 * 마이팀이 없을 때만 10개 구단을 모두 보여 주고 고르게 한다.
 */
export function TeamPicker({ teams, favoriteTeam, selectedTeamId, onSelect, favoriteSettingPath }: TeamPickerProps) {
  if (favoriteTeam) {
    return (
      <section
        className="team-picker team-picker--mine"
        aria-label="마이팀"
        style={{ '--team-color': favoriteTeam.primaryColor } as CSSProperties}
      >
        <div className="team-picker__mine">
          <Logo team={favoriteTeam} />
          <div className="team-picker__name">
            <strong>{teamNameEn(favoriteTeam)}</strong>
            {/* 영어 이름과 같으면(매핑에 없는 구단) 같은 글자를 두 번 쓰지 않는다. */}
            {favoriteTeam.name !== teamNameEn(favoriteTeam) && <small>{favoriteTeam.name}</small>}
          </div>
        </div>
        {selectedTeamId !== favoriteTeam.id && (
          <button type="button" className="button button--ghost button--sm" onClick={() => onSelect(favoriteTeam.id)}>
            마이팀 게시판으로
          </button>
        )}
      </section>
    )
  }

  return (
    <nav className="team-picker team-picker--choose" aria-label="구단 선택">
      <p className="team-picker__hint">
        게시판을 볼 구단을 고르세요. <Link to={favoriteSettingPath}>마이팀을 정하면</Link> 내 구단만 바로 볼 수 있어요.
      </p>
      <div className="team-picker__grid">
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className={`team-picker__team${team.id === selectedTeamId ? ' is-selected' : ''}`}
            style={{ '--team-color': team.primaryColor } as CSSProperties}
            aria-label={`${teamNameEn(team)} 게시판`}
            aria-pressed={team.id === selectedTeamId}
            onClick={() => onSelect(team.id)}
          >
            <Logo team={team} />
            <span aria-hidden="true">{teamNameEn(team)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
