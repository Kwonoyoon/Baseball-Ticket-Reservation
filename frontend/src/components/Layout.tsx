import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'

export function Layout() {
  const { member, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand">
            <span className="brand__ball" aria-hidden="true" />
            볼파크<span className="brand__sub">티켓</span>
          </Link>

          <nav className="site-nav" aria-label="주요 메뉴">
            <NavLink to="/" end>
              경기 일정
            </NavLink>
            <NavLink to="/my/reservations">예매 내역</NavLink>
          </nav>

          <div className="site-header__auth">
            {member ? (
              <>
                <span className="site-header__user">{member.name}님</span>
                <a className="button button--ghost-light button--sm" href="http://localhost:5174/myticket">
                  내 티켓
                </a>
                <button type="button" className="button button--ghost-light button--sm" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="button button--ghost-light button--sm" to="/login">
                  로그인
                </Link>
                <Link className="button button--accent button--sm" to="/signup">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          볼파크 티켓은 학습용 사이드 프로젝트입니다. 실제 결제가 이루어지지 않으며 경기 일정은 샘플 데이터입니다.
        </div>
      </footer>
    </div>
  )
}
