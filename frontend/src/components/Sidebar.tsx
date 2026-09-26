import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { openCalendarWindow } from '../lib/calendarWindow'
import { CalendarIcon, CloseIcon, TicketIcon } from './icons'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

/**
 * 헤더의 메뉴 버튼으로 여는 왼쪽 사이드바. 로그인한 사람에게만 헤더가 이 버튼을 보여 준다.
 * 항목을 더 넣으려면 아래 nav 안에 버튼을 추가하면 된다.
 *
 * body에 포털로 그리는 이유: 헤더에 backdrop-filter가 걸려 있어서, 헤더 안에 그리면
 * position: fixed가 화면이 아니라 헤더(64px)를 기준으로 잡혀 사이드바가 헤더 높이로 잘린다.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return undefined

    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="sidebar-layer">
      <button type="button" className="sidebar-backdrop" aria-label="사이드바 닫기" tabIndex={-1} onClick={onClose} />
      <aside className="sidebar" aria-label="사이드바">
        <div className="sidebar__head">
          <strong>메뉴</strong>
          <button ref={closeButtonRef} type="button" className="icon-button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="사이드바 메뉴">
          {/* 좁은 화면에서는 헤더의 메뉴 링크를 접기 때문에, 예매내역도 여기서 갈 수 있어야 한다. */}
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
        </nav>
      </aside>
    </div>,
    document.body,
  )
}
