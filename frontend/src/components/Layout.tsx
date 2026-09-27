import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { NotificationBell } from './NotificationBell'

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function Layout() {
  const { member, expiresAt, logout } = useAuth()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const logoutTimeLabel = expiresAt ? formatCountdown(expiresAt - now) : null

  return (
    <div className="app">
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand">
            SAFE<em>TICKET</em>
          </Link>

          <nav className="site-nav" aria-label="주요 메뉴">
            <NavLink to="/" end>
              경기 일정
            </NavLink>
            <NavLink to="/my/reservations">예매내역</NavLink>
          </nav>

          <div className="site-header__auth">
            {member ? (
              <>
                <NotificationBell />
                <span className="site-header__user">{member.name}님</span>
                <button type="button" className="button button--ghost button--sm" onClick={handleLogout}>
                  로그아웃
                </button>
                {logoutTimeLabel && (
                  <span className="site-header__logout-time">{logoutTimeLabel} 후 자동 로그아웃</span>
                )}
              </>
            ) : (
              <>
                <Link className="button button--ghost button--sm" to="/login">
                  로그인
                </Link>
                <Link className="button button--primary button--sm" to="/signup">
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
          SAFETICKET은 학습용 사이드 프로젝트입니다. 실제 결제가 이루어지지 않으며 경기 일정은 샘플 데이터입니다.
        </div>
      </footer>
    </div>
  )
}
