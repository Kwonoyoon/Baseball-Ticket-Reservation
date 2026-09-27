import { request } from './client'
import type {
  GameDetail,
  GameSummary,
  HoldResult,
  LoginResult,
  Member,
  Notification,
  NotificationPreference,
  NotificationType,
  PaymentMethod,
  Reservation,
  SeatPosition,
  SeatStatus,
  SeatSummary,
  Team,
} from './types'

export const api = {
  signup: (body: { email: string; password: string; name: string }) =>
    request<Member>('/auth/signup', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<LoginResult>('/auth/login', { method: 'POST', body }),

  getTeams: (signal?: AbortSignal) => request<Team[]>('/teams', { signal }),

  getSchedule: (date: string, teamId: number | null, signal?: AbortSignal) => {
    const params = new URLSearchParams({ date })
    if (teamId !== null) params.set('teamId', String(teamId))
    return request<GameSummary[]>(`/games?${params}`, { signal })
  },

  getGame: (gameId: number, signal?: AbortSignal) => request<GameDetail>(`/games/${gameId}`, { signal }),

  /** 좌석 목록은 구역 단위로만 조회한다. (구장 전체 좌석은 너무 많다) */
  getSeatStatus: (gameId: number, sectionId: number, signal?: AbortSignal) =>
    request<SeatStatus>(`/games/${gameId}/seats?sectionId=${sectionId}`, { signal }),

  getSeatSummary: (gameId: number, signal?: AbortSignal) =>
    request<SeatSummary>(`/games/${gameId}/seats/summary`, { signal }),

  holdSeats: (gameId: number, seats: SeatPosition[]) =>
    request<HoldResult>(`/games/${gameId}/holds`, { method: 'POST', body: { seats } }),

  releaseSeats: (gameId: number) => request<void>(`/games/${gameId}/holds`, { method: 'DELETE' }),

  reserve: (body: { gameId: number; seats: SeatPosition[]; paymentMethod: PaymentMethod }) =>
    request<Reservation>('/reservations', { method: 'POST', body }),

  getMyReservations: (signal?: AbortSignal) => request<Reservation[]>('/reservations/me', { signal }),

  getReservation: (reservationId: number, signal?: AbortSignal) =>
    request<Reservation>(`/reservations/${reservationId}`, { signal }),

  cancelReservation: (reservationId: number) =>
    request<Reservation>(`/reservations/${reservationId}/cancel`, { method: 'POST' }),

  getNotifications: (signal?: AbortSignal) => request<Notification[]>('/notifications', { signal }),

  getUnreadNotificationCount: (signal?: AbortSignal) =>
    request<{ count: number }>('/notifications/unread-count', { signal }),

  markNotificationRead: (notificationId: number) =>
    request<void>(`/notifications/${notificationId}/read`, { method: 'POST' }),

  markAllNotificationsRead: () => request<void>('/notifications/read-all', { method: 'POST' }),

  deleteAllNotifications: () => request<void>('/notifications', { method: 'DELETE' }),

  getNotificationPreferences: (signal?: AbortSignal) =>
    request<NotificationPreference[]>('/notifications/preferences', { signal }),

  updateNotificationPreference: (type: NotificationType, enabled: boolean) =>
    request<void>(`/notifications/preferences/${type}`, { method: 'POST', body: { enabled } }),
}
