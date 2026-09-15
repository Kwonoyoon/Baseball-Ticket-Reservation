import { request } from './client'
import type {
  GameDetail,
  GameSummary,
  HoldResult,
  LoginResult,
  Member,
  PaymentMethod,
  Reservation,
  SeatPosition,
  SeatStatus,
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

  getSeatStatus: (gameId: number, signal?: AbortSignal) =>
    request<SeatStatus>(`/games/${gameId}/seats`, { signal }),

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
