import { NavLink, Outlet } from 'react-router'
import './AdminLayout.css'

/** 관리자 영역의 메뉴. 새 관리자 화면은 여기에 항목을 더하고 App.tsx의 /admin 아래에 라우트를 추가한다. */
const ADMIN_MENU = [
  { to: '/admin', label: '대시보드', end: true },
  { to: '/admin/members', label: '회원 관리', end: false },
  { to: '/admin/community/reports', label: '신고 관리', end: false },
  { to: '/admin/notices', label: '공지 관리', end: false },
  { to: '/admin/entry', label: '입장 확인', end: false },
]

/**
 * 관리자 페이지의 공통 틀. 위쪽 메뉴로 관리자 화면들 사이를 오가고, 아래에 선택한 화면(Outlet)이 들어온다.
 * 접근 제어는 이 틀을 감싸는 RequireAdmin과 서버(/api/admin/**)가 한다.
 */
export function AdminLayout() {
  return (
    <div className="admin-shell">
      <nav className="admin-tabs" aria-label="관리자 메뉴">
        {ADMIN_MENU.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="admin-tabs__item">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
