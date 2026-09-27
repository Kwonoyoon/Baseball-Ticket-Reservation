import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'

/**
 * 메인 화면 전용 헤더. 메뉴는 예매내역과 로그인/로그아웃뿐이다.
 * 로그인 전에는 예매내역을 아예 렌더링하지 않는다. (숨김 처리가 아니라 DOM에 없다)
 * 다만 이건 화면 정리일 뿐 접근 제어가 아니다. /my/reservations는 RequireAuth와 서버 401이 막는다.
 */
export function HomeHeader() {
  const { member, logout } = useAuth()

  return (
    <header className="home-header">
      <div className="home-header__inner">
        <Link to="/" className="home-brand" aria-label="SAFETICKET 홈">
          SAFE<em>TICKET</em>
        </Link>

        {member && (
          <nav className="home-nav" aria-label="주요 메뉴">
            <Link to="/my/reservations">예매내역</Link>
          </nav>
        )}

        <div className="home-header__auth">
          {member ? (
            <button type="button" className="home-outline-button" onClick={logout}>
              로그아웃
            </button>
          ) : (
            <Link className="home-outline-button" to="/login">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
