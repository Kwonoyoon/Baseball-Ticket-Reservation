import { createContext } from 'react'
import type { Notification } from '../api/types'

export type NotificationContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationId: number) => void
  markAllAsRead: () => void
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)
