import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { Team } from '../api/types'
import { teamLogo } from '../lib/teamLogos'
import { teamNameEn } from '../lib/teamNames'

/**
 * 흐르는 구단 목록을 몇 벌 이어 붙일지. 목록 한 벌의 폭 × (이 값 ÷ 2)가 화면 폭보다 커야 끝이 비지 않는다.
 * 4벌이면 한 벌(구단 10개, 약 920px)의 두 배(1840px)가 화면 폭 이상이라 넉넉하다. 반드시 짝수여야 한다.
 */
const MARQUEE_COPIES = 4

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
  // 마이팀 배너를 누르면 아래에 구단 목록이 펼쳐진다. 훅은 조건문 앞에서 불러야 해서 맨 위에 둔다.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (favoriteTeam) {
    // 배너에는 지금 보고 있는 구단을 보여 준다. (다른 구단을 고르면 배너도 그 구단으로 바뀐다)
    const viewing = teams.find((team) => team.id === selectedTeamId) ?? favoriteTeam
    return (
      <section
        className={`team-picker team-picker--mine${open ? ' is-open' : ''}`}
        aria-label="마이팀"
        style={{ '--team-color': viewing.primaryColor } as CSSProperties}
      >
        <button
          type="button"
          className="team-picker__mine"
          aria-expanded={open}
          aria-controls="team-picker-strip"
          aria-label={`${teamNameEn(viewing)} 게시판, 눌러서 다른 구단 보기`}
          onClick={() => setOpen((current) => !current)}
        >
          <Logo team={viewing} />
          <span className="team-picker__name">
            <strong>{teamNameEn(viewing)}</strong>
            {/* 영어 이름과 같으면(매핑에 없는 구단) 같은 글자를 두 번 쓰지 않는다. */}
            {viewing.name !== teamNameEn(viewing) && <small>{viewing.name}</small>}
          </span>
          <span className="team-picker__chevron" aria-hidden="true" />
        </button>

        {open && (
          // 구단 목록이 누르지 않아도 옆으로 천천히 흐른다. 마우스를 올리거나 키보드로 포커스하면 멈춘다.
          // 끊김 없이 이어지도록 같은 목록을 여러 벌 이어 붙이고, 첫 벌만 진짜 목록(나머지는 보조기기·키보드에서 숨김).
          <div className="team-picker__marquee">
            <div className="team-picker__track">
              {Array.from({ length: MARQUEE_COPIES }, (_, copy) => (
                <ul
                  key={copy}
                  id={copy === 0 ? 'team-picker-strip' : undefined}
                  className="team-picker__strip"
                  aria-label={copy === 0 ? '구단 목록' : undefined}
                  aria-hidden={copy === 0 ? undefined : true}
                >
                  {teams.map((team) => (
                    <li key={team.id}>
                      <button
                        type="button"
                        className={`team-picker__team${team.id === viewing.id ? ' is-selected' : ''}`}
                        style={{ '--team-color': team.primaryColor } as CSSProperties}
                        aria-label={`${teamNameEn(team)} 게시판`}
                        aria-pressed={team.id === viewing.id}
                        tabIndex={copy === 0 ? undefined : -1}
                        onClick={() => {
                          setOpen(false)
                          if (team.id !== viewing.id) onSelect(team.id)
                        }}
                      >
                        <Logo team={team} />
                        <span aria-hidden="true">
                          {teamNameEn(team)}
                          {team.id === favoriteTeam.id && <i className="team-picker__my"> ★</i>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
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
