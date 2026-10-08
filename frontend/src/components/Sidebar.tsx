import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { openCalendarWindow } from '../lib/calendarWindow'
import {
  CalendarIcon,
  CloseIcon,
  LogoutIcon,
  MegaphoneIcon,
  MessageIcon,
  SearchIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
} from './icons'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

/** 여닫는 동안 화면에 남겨 둘 시간. index.css의 전환 시간과 같아야 한다. */
const ANIMATION_MS = 280

/**
 * 헤더의 메뉴 버튼으로 여는 오른쪽 사이드바. 로그인한 사람에게만 헤더가 이 버튼을 보여 준다.
 * 항목을 더 넣으려면 아래 nav 안에 버튼을 추가하면 된다.
 *
 * body에 포털로 그리는 이유: 헤더에 backdrop-filter가 걸려 있어서, 헤더 안에 그리면
 * position: fixed가 화면이 아니라 헤더(64px)를 기준으로 잡혀 사이드바가 헤더 높이로 잘린다.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  // 닫는 동안에도 잠깐 화면에 남겨야 빠져나가는 모습이 보인다.
  // (들어오는 애니메이션은 CSS가 알아서 재생하므로 상태가 필요 없다)
  const [closing, setClosing] = useState(false)
  const wasOpen = useRef(open)

  useEffect(() => {
    const justClosed = wasOpen.current && !open
    wasOpen.current = open
    if (!justClosed) return undefined
    setClosing(true)
    const timer = window.setTimeout(() => setClosing(false), ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open && !closing) return null

  const handleLogout = () => {
    onClose()
    void logout()
    navigate('/')
  }

  return createPortal(
    <div className={`sidebar-layer${closing ? ' is-closing' : ''}`}>
      <button type="button" className="sidebar-backdrop" aria-label="사이드바 닫기" tabIndex={-1} onClick={onClose} />
      <aside className="sidebar" aria-label="사이드바">
        <div className="sidebar__head">
          <strong>메뉴</strong>
          <button ref={closeButtonRef} type="button" className="icon-button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="사이드바 메뉴">
          {/* 좁은 화면에서는 헤더의 메뉴 링크를 접기 때문에, 예매내역·커뮤니티도 여기서 갈 수 있어야 한다. */}
          <Link to="/community" className="sidebar__item" onClick={onClose}>
            <MessageIcon />
            <span>커뮤니티</span>
          </Link>
          <Link to="/notices" className="sidebar__item" onClick={onClose}>
            <MegaphoneIcon />
            <span>공지</span>
          </Link>
          <Link to="/lost-properties" className="sidebar__item" onClick={onClose}>
            <SearchIcon />
            <span>분실물센터</span>
          </Link>
          <Link to="/my/reservations" className="sidebar__item" onClick={onClose}>
            <TicketIcon />
            <span>예매내역</span>
          </Link>
          <button
            type="button"
            className="sidebar__item"
            onClick={() => {
              openCalendarWindow()
              onClose()
            }}
          >
            <CalendarIcon />
            <span>
              직관 캘린더
              <small>새 창으로 열려요</small>
            </span>
          </button>
          <Link to="/my/account" className="sidebar__item" onClick={onClose}>
            <UserIcon />
            <span>마이페이지</span>
          </Link>
          {/* 관리자에게만 렌더링한다. 접근 제어는 RequireAdmin과 서버(/api/admin/**)가 한다. */}
          {isAdmin && (
            <Link to="/admin" className="sidebar__item" onClick={onClose}>
              <UsersIcon />
              <span>
                관리자 페이지
                <small>대시보드·회원·신고·공지·입장</small>
              </span>
            </Link>
          )}
          <button type="button" className="sidebar__item sidebar__item--logout" onClick={handleLogout}>
            <LogoutIcon />
            <span>로그아웃</span>
          </button>
        </nav>
      </aside>
    </div>,
    document.body,
  )
}
