import { request } from './client'
import type {
  AdminMember,
  GameDetail,
  GameSummary,
  HoldResult,
  LoginResult,
  Member,
  MemberRole,
  PaymentMethod,
  Reservation,
  SeatPosition,
  SeatStatus,
  SeatSummary,
  Team,
} from './types'

export const api = {
  signup: (body: { username: string; email: string; password: string; name: string }) =>
    request<Member>('/auth/signup', { method: 'POST', body }),

  login: (body: { username: string; password: string; autoLogin: boolean }) =>
    request<LoginResult>('/auth/login', { method: 'POST', body }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  /** 다른 기기는 모두 로그아웃되고, 이 브라우저는 새 토큰을 받는다. */
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<LoginResult>('/auth/password', { method: 'PUT', body }),

  withdraw: (password: string) => request<void>('/members/me/withdraw', { method: 'POST', body: { password } }),

  getAdminMembers: (keyword: string, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('keyword', keyword.trim())
    const query = params.size > 0 ? `?${params}` : ''
    return request<AdminMember[]>(`/admin/members${query}`, { signal })
  },

  lockMember: (memberId: number) => request<AdminMember>(`/admin/members/${memberId}/lock`, { method: 'POST' }),

  unlockMember: (memberId: number) => request<AdminMember>(`/admin/members/${memberId}/unlock`, { method: 'POST' }),

  changeMemberRole: (memberId: number, role: MemberRole) =>
    request<AdminMember>(`/admin/members/${memberId}/role`, { method: 'PUT', body: { role } }),

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
}
