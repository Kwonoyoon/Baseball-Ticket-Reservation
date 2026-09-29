import { request } from './client'
import type {
  AdminMember,
  Comment,
  GameDetail,
  GameSummary,
  HoldResult,
  LikeResult,
  LoginResult,
  Member,
  MemberRole,
  Notification,
  NotificationPreference,
  NotificationType,
  PaymentMethod,
  PostDetail,
  PostPage,
  Report,
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

  updateProfile: (body: { name: string; email: string; currentPassword: string }) =>
    request<Member>('/members/me/profile', { method: 'PUT', body }),

  withdraw: (password: string) => request<void>('/members/me/withdraw', { method: 'POST', body: { password } }),

  getAdminMembers: (keyword: string, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('keyword', keyword.trim())
    const query = params.size > 0 ? `?${params}` : ''
    return request<AdminMember[]>(`/admin/members${query}`, { signal })
  },

  lockMember: (memberId: number) => request<AdminMember>(`/admin/members/${memberId}/lock`, { method: 'POST' }),

  unlockMember: (memberId: number) => request<AdminMember>(`/admin/members/${memberId}/unlock`, { method: 'POST' }),

  /** 회원 삭제. 서버는 행을 지우지 않고 탈퇴 처리한다. (예매 이력 보존) */
  deleteMember: (memberId: number) => request<AdminMember>(`/admin/members/${memberId}`, { method: 'DELETE' }),

  changeMemberRole: (memberId: number, role: MemberRole) =>
    request<AdminMember>(`/admin/members/${memberId}/role`, { method: 'PUT', body: { role } }),

  getTeams: (signal?: AbortSignal) => request<Team[]>('/teams', { signal }),

  updateFavoriteTeam: (teamId: number | null) =>
    request<Member>('/members/me/favorite-team', { method: 'PATCH', body: { teamId } }),

  getPosts: (teamId: number, page: number, signal?: AbortSignal) =>
    request<PostPage>(`/teams/${teamId}/posts?page=${page}&size=20`, { signal }),

  createPost: (teamId: number, body: { title: string; content: string }) =>
    request<PostDetail>(`/teams/${teamId}/posts`, { method: 'POST', body }),

  getPost: (postId: number, signal?: AbortSignal) => request<PostDetail>(`/posts/${postId}`, { signal }),

  updatePost: (postId: number, body: { title: string; content: string }) =>
    request<PostDetail>(`/posts/${postId}`, { method: 'PUT', body }),

  deletePost: (postId: number) => request<void>(`/posts/${postId}`, { method: 'DELETE' }),

  togglePostLike: (postId: number) => request<LikeResult>(`/posts/${postId}/like`, { method: 'POST' }),

  reportPost: (postId: number, reason: string) =>
    request<void>(`/posts/${postId}/report`, { method: 'POST', body: { reason } }),

  getComments: (postId: number, signal?: AbortSignal) =>
    request<Comment[]>(`/posts/${postId}/comments`, { signal }),

  createComment: (postId: number, content: string) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: { content } }),

  deleteComment: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),

  reportComment: (commentId: number, reason: string) =>
    request<void>(`/comments/${commentId}/report`, { method: 'POST', body: { reason } }),

  getCommunityReports: (signal?: AbortSignal) =>
    request<Report[]>('/admin/community/reports', { signal }),

  deletePostAsAdmin: (postId: number) => request<void>(`/admin/community/posts/${postId}`, { method: 'DELETE' }),

  deleteCommentAsAdmin: (commentId: number) =>
    request<void>(`/admin/community/comments/${commentId}`, { method: 'DELETE' }),

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

  updateNotificationEmailPreference: (type: NotificationType, enabled: boolean) =>
    request<void>(`/notifications/preferences/${type}/email`, { method: 'POST', body: { enabled } }),
}
