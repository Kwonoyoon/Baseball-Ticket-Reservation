import { useCallback, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { BellIcon } from './icons'
import { Sidebar } from './Sidebar'

/**
 * 모든 화면이 함께 쓰는 헤더. 메인 화면(SchedulePage)도 다른 화면(Layout)도 이 파일 하나만 가져다 쓴다.
 * 예전엔 이 둘이 따로 구현돼 있어서 로고 크기·글꼴이 서로 어긋나는 일이 있었다 — 그래서 하나로 합쳤다.
 *
 * 비회원(로그인 전)에게는 예매내역·메뉴(사이드바)·알림을 아예 렌더링하지 않고, 회원 관리는 관리자에게만 보인다. (숨김이 아니라 DOM에 없음)
 * 다만 이건 화면 정리일 뿐 접근 제어가 아니다. 회원 화면은 RequireAuth와 서버 401이, 관리자 화면은 RequireAdmin과 서버 403이 막는다.
 */
export function Header() {
  const { member, isAdmin, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    // 키보드 사용자가 닫은 뒤 원래 있던 자리로 돌아오게 한다.
    menuButtonRef.current?.focus()
  }, [])

  const handleLogout = () => {
    void logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">

        <Link to="/" className="brand">
          SAFE<em>TICKET</em>
        </Link>

        <nav className="site-nav" aria-label="주요 메뉴">
          <NavLink to="/" end>
            경기 일정
          </NavLink>
          {member && <NavLink to="/my/reservations">예매내역</NavLink>}
          {isAdmin && <NavLink to="/admin/members">회원 관리</NavLink>}
        </nav>

        <div className="site-header__auth">
          {member ? (
            <>
              {/* 알림은 모양만 있다. 눌렀을 때의 동작은 알림 담당 팀원이 연결한다. */}
              <button type="button" className="icon-button" aria-label="알림">
                <BellIcon />
              </button>
              <Link to="/my/account" className="site-header__user" title="마이페이지">
                {member.name}님
              </Link>
              <button type="button" className="button button--ghost button--sm" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : loading ? null : (
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

        {member && (
          <button
            ref={menuButtonRef}
            type="button"
            className={`icon-button site-header__menu${sidebarOpen ? ' is-open' : ''}`}
            aria-label="메뉴 열기"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {/* 세 줄이 X로 바뀌는 애니메이션이라 아이콘 대신 선을 직접 그린다. */}
            <span className="hamburger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        )}
      </div>

      <Sidebar open={sidebarOpen && member !== null} onClose={closeSidebar} />
    </header>
  )
}
