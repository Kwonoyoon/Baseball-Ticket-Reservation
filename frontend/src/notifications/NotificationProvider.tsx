import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { currentAccessToken, onSessionChange, refreshSession } from '../api/client'
import { api } from '../api/endpoints'
import type { Notification } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { NotificationContext, type NotificationContextValue } from './notificationContext'

/** 스트림이 끊긴 뒤 다시 붙기까지 기다리는 시간. 서버가 내려가 있을 때 요청이 몰리지 않게 한다. */
const RECONNECT_DELAY_MS = 3_000

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

    let source: EventSource | null = null
    let retryTimer: number | undefined

    // EventSource는 Authorization 헤더를 못 보내므로 토큰을 쿼리 파라미터로 전달한다.
    // 액세스 토큰은 30분마다 바뀌므로, 붙을 때마다 지금 토큰을 새로 읽는다.
    const connect = () => {
      const token = currentAccessToken()
      source?.close()
      if (!token) return
      source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`)
      source.addEventListener('notification', (event) => {
        const notification = JSON.parse((event as MessageEvent<string>).data) as Notification
        setNotifications((prev) => [notification, ...prev])
        setUnreadCount((prev) => prev + 1)
      })
      source.onerror = () => {
        // 네트워크가 잠깐 끊긴 정도면 브라우저가 알아서 다시 붙는다.
        // 토큰이 만료돼 거절(401)되면 브라우저는 포기하므로, 토큰을 갱신해 다시 붙는다.
        if (source?.readyState !== EventSource.CLOSED) return
        window.clearTimeout(retryTimer)
        retryTimer = window.setTimeout(() => void refreshSession(), RECONNECT_DELAY_MS)
      }
    }

    connect()
    // 로그인·토큰 갱신 때마다 새 토큰으로 다시 붙는다. (로그아웃이면 위의 isAuthenticated가 정리한다)
    const unsubscribe = onSessionChange((member) => {
      if (member) connect()
    })
    return () => {
      unsubscribe()
      window.clearTimeout(retryTimer)
      source?.close()
    }
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
