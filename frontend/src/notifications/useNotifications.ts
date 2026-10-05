import { useContext } from 'react'
import { NotificationContext, type NotificationContextValue } from './notificationContext'

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext)
  if (!value) {
    throw new Error('useNotifications는 NotificationProvider 안에서만 사용할 수 있습니다.')
  }
  return value
}
