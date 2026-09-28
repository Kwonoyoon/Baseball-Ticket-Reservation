import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '../lib/format'
import { useNotifications } from '../notifications/useNotifications'
import { BellIcon } from './icons'

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="icon-button notification-bell__trigger"
        aria-label="알림"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="menu">
          <div className="notification-panel__header">
            <strong>알림</strong>
            <span className="notification-panel__header-actions">
              {notifications.length > 0 && (
                <button type="button" className="notification-panel__mark-all" onClick={markAllAsRead}>
                  모두 읽음
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" className="notification-panel__delete-all" onClick={deleteAll}>
                  모두 삭제
                </button>
              )}
              <Link to="/notifications/settings" className="notification-panel__settings" onClick={() => setOpen(false)}>
                설정
              </Link>
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="notification-panel__empty">알림이 없습니다.</p>
          ) : (
            <ul className="notification-panel__list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="notification-item"
                    data-read={notification.read}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <span className="notification-item__dot" aria-hidden="true" />
                    <span className="notification-item__body">
                      <span className="notification-item__title">{notification.title}</span>
                      <span className="notification-item__message">{notification.message}</span>
                      <span className="notification-item__time">{formatDateTime(notification.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
