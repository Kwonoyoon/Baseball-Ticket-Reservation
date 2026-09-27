import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadStoredAuth } from '../api/client'
import { api } from '../api/endpoints'
import type { Notification } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { NotificationContext, type NotificationContextValue } from './notificationContext'

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const controller = new AbortController()
    Promise.all([api.getNotifications(controller.signal), api.getUnreadNotificationCount(controller.signal)])
      .then(([list, { count }]) => {
        setNotifications(list)
        setUnreadCount(count)
      })
      .catch(() => {
        // 초기 목록 조회 실패는 SSE 연결로 이후 알림을 받는 데는 지장이 없으므로 조용히 넘어간다.
      })
    return () => controller.abort()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    const token = loadStoredAuth()?.accessToken
    if (!token) return

    // EventSource는 Authorization 헤더를 못 보내므로 토큰을 쿼리 파라미터로 전달한다.
    const source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`)
    source.addEventListener('notification', (event) => {
      const notification = JSON.parse((event as MessageEvent<string>).data) as Notification
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    })
    source.onerror = () => {
      // 브라우저가 자동으로 재연결을 시도하므로 별도 처리는 하지 않는다.
    }
    return () => source.close()
  }, [isAuthenticated])

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId && !n.read ? { ...n, read: true } : n)),
    )
    setUnreadCount((prev) => {
      const target = notifications.find((n) => n.id === notificationId)
      return target && !target.read ? Math.max(0, prev - 1) : prev
    })
    api.markNotificationRead(notificationId).catch(() => {
      // 실패해도 다음 목록 새로고침 시 서버 상태로 다시 맞춰진다.
    })
  }, [notifications])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    api.markAllNotificationsRead().catch(() => {
      // 실패해도 다음 목록 새로고침 시 서버 상태로 다시 맞춰진다.
    })
  }, [])

  const deleteAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    api.deleteAllNotifications().catch(() => {
      // 실패해도 다음 목록 새로고침 시 서버 상태로 다시 맞춰진다.
    })
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead, deleteAll }),
    [notifications, unreadCount, markAsRead, markAllAsRead, deleteAll],
  )

  return <NotificationContext value={value}>{children}</NotificationContext>
}
