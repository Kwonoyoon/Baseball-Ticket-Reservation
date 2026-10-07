import { useCallback, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { NotificationBell } from './NotificationBell'
import { Sidebar } from './Sidebar'
import brandLogo from '../../image/safeticket_full.png'

/**
 * 모든 화면이 함께 쓰는 헤더. 메인 화면(SchedulePage)도 다른 화면(Layout)도 이 파일 하나만 가져다 쓴다.
 * 두 줄 구조다: 윗줄은 로고와 마이페이지·알림(로그인 전엔 로그인·회원가입)만, 아랫줄은 경기 일정·예매내역 메뉴다.
 *
 * 비회원(로그인 전)에게는 예매내역·메뉴(사이드바)·마이페이지·알림을 아예 렌더링하지 않는다. (숨김이 아니라 DOM에 없음)
 * 다만 이건 화면 정리일 뿐 접근 제어가 아니다. 회원 화면은 RequireAuth와 서버 401이, 관리자 화면은 RequireAdmin과 서버 403이 막는다.
 * 로그아웃·관리자 페이지는 사이드바(메뉴 버튼) 안에 있다.
 */
export function Header() {
  const { member, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    // 키보드 사용자가 닫은 뒤 원래 있던 자리로 돌아오게 한다.
    menuButtonRef.current?.focus()
  }, [])

  return (
    <header className="site-header">
      <div className="container site-header__row">
        <Link to="/" className="brand">
          <img src={brandLogo} alt="SAFETICKET" className="brand__logo" />
        </Link>

        <div className="site-header__auth">
          {member ? (
            <>
              <Link to="/my/account" className="site-header__mypage">
                {member.name}님
              </Link>
              {/* 입장할 때 바로 꺼낼 수 있게 늘 보이는 자리에 둔다. */}
              <Link to="/my/ticket" className="button button--primary button--sm site-header__ticket">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z" />
                  <path d="M10 6v12" strokeDasharray="2 2" />
                </svg>
                {/* 아주 좁은 화면에서는 글자를 숨기고 아이콘만 보인다. (화면 낭독기는 그대로 읽는다) */}
                <span className="site-header__ticket-label">내 티켓</span>
              </Link>
              <NotificationBell />
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
            </>
          ) : loading ? null : (
            <>
              <Link className="button button--ghost button--sm" to="/login">
                로그인
              </Link>
              <Link className="button button--primary button--sm site-header__signup" to="/signup">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="container site-nav" aria-label="주요 메뉴">
        <NavLink to="/" end>
          경기 일정
        </NavLink>
        <NavLink to="/community">커뮤니티</NavLink>
        {member && <NavLink to="/my/reservations">예매내역</NavLink>}
        {member && <NavLink to="/transfers">티켓 양도</NavLink>}
      </nav>

      <Sidebar open={sidebarOpen && member !== null} onClose={closeSidebar} />
    </header>
  )
}
