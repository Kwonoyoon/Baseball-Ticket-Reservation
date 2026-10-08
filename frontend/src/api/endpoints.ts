import { request } from './client'
import type {
  AdminDashboard,
  AdminMember,
  Comment,
  EntryTicket,
  EntryVerification,
  GameDetail,
  GameSummary,
  HoldResult,
  HotGame,
  HotPost,
  LostProperty,
  LostPropertyInput,
  LostStatus,
  LikeResult,
  LoginResult,
  Member,
  MemberRole,
  Notice,
  NoticeInput,
  NoticeScope,
  Notification,
  NotificationPreference,
  NotificationType,
  PaymentMethod,
  PostCategory,
  PostDetail,
  PostPage,
  PostSummary,
  RecentTransfer,
  Report,
  Reservation,
  SeatPosition,
  SeatStatus,
  SeatSummary,
  Standing,
  Team,
  TeamPostCount,
  Transfer,
  TransferWait,
} from './types'

/** 커뮤니티 글 목록 한 쪽에 보여 주는 글 수 (백엔드 기본값과 같다) */
export const POSTS_PER_PAGE = 10

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

  getTeamPostCounts: (signal?: AbortSignal) =>
    request<TeamPostCount[]>('/community/team-post-counts', { signal }),

  /** category를 주면 그 분류만, 안 주면 모든 분류를 섞어 준다. keyword를 주면 제목·본문에서 찾는다. */
  getPosts: (teamId: number, page: number, signal?: AbortSignal, category?: PostCategory, keyword?: string) =>
    request<PostPage>(
      `/teams/${teamId}/posts?page=${page}&size=${POSTS_PER_PAGE}${category ? `&category=${category}` : ''}${
        keyword ? `&q=${encodeURIComponent(keyword)}` : ''
      }`,
      { signal },
    ),

  createPost: (teamId: number, body: { category: PostCategory; title: string; content: string }) =>
    request<PostDetail>(`/teams/${teamId}/posts`, { method: 'POST', body }),

  getPost: (postId: number, signal?: AbortSignal) => request<PostDetail>(`/posts/${postId}`, { signal }),

  updatePost: (postId: number, body: { category: PostCategory; title: string; content: string }) =>
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

  getAdminDashboard: (signal?: AbortSignal) => request<AdminDashboard>('/admin/dashboard', { signal }),

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

  /** 경기 취소(관리자 전용, 우천취소 등). 예매자 전원에게 알림·이메일이 자동 발송되고 예매는 취소·환불된다. */
  cancelGame: (gameId: number) => request<GameDetail>(`/games/${gameId}/cancel`, { method: 'PATCH' }),

  /** 좌석 목록은 구역 단위로만 조회한다. (구장 전체 좌석은 너무 많다) */
  getSeatStatus: (gameId: number, sectionId: number, signal?: AbortSignal) =>
    request<SeatStatus>(`/games/${gameId}/seats?sectionId=${sectionId}`, { signal }),

  getSeatSummary: (gameId: number, signal?: AbortSignal) =>
    request<SeatSummary>(`/games/${gameId}/seats/summary`, { signal }),

  holdSeats: (gameId: number, seats: SeatPosition[]) =>
    request<HoldResult>(`/games/${gameId}/holds`, { method: 'POST', body: { seats } }),

  releaseSeats: (gameId: number) => request<void>(`/games/${gameId}/holds`, { method: 'DELETE' }),

  /** 결제 대기 예매를 만든다. 돌려준 예매번호(주문번호)·금액으로 결제창을 연다. */
  reserve: (body: { gameId: number; seats: SeatPosition[]; paymentMethod: PaymentMethod }) =>
    request<Reservation>('/reservations', { method: 'POST', body }),

  /** 결제창에서 인증을 마친 결제를 승인하고 예매를 확정한다. 같은 결제로 다시 불러도 안전하다. */
  confirmPayment: (body: { paymentKey: string; orderId: string; amount: number }) =>
    request<Reservation>('/reservations/confirm', { method: 'POST', body }),

  /** 결제를 그만두면 결제 대기 예매를 지우고 좌석을 푼다. 다시 고르러 갈 경기를 돌려준다. */
  abandonPayment: (orderId: string) =>
    request<{ gameId: number }>('/reservations/abandon', { method: 'POST', body: { orderId } }),

  /** 가짜 PG 결제창의 [결제하기]. 거절되면 PG 오류 코드·문구가 ApiError로 온다. */
  mockPgCheckout: (body: {
    orderId: string
    orderName: string
    amount: number
    method: PaymentMethod
    cardCompany: string | null
    installmentMonths: number
    testOutcome: string
  }) => request<{ paymentKey: string; orderId: string; amount: number }>('/mock-pg/checkout', { method: 'POST', body }),

  getMyReservations: (signal?: AbortSignal) => request<Reservation[]>('/reservations/me', { signal }),

  getReservation: (reservationId: number, signal?: AbortSignal) =>
    request<Reservation>(`/reservations/${reservationId}`, { signal }),

  cancelReservation: (reservationId: number) =>
    request<Reservation>(`/reservations/${reservationId}/cancel`, { method: 'POST' }),

  /** 입장 QR 값(서버 서명)과 입장 시각. QR을 새로 그릴 때마다 받는다. */
  issueEntryTicket: (reservationId: number, signal?: AbortSignal) =>
    request<EntryTicket>(`/reservations/${reservationId}/entry-ticket`, { method: 'POST', signal }),

  /** 입장 게이트(관리자)에서 읽은 QR 값을 검증하고, 입장할 수 있으면 서버가 바로 입장 처리한다. (재입장 불가) */
  verifyEntry: (token: string, signal?: AbortSignal) =>
    request<EntryVerification>('/admin/entry/verify', { method: 'POST', body: { token }, signal }),

  /** 판매 중인 양도글. teamId를 주면 그 구단이 뛰는 경기만. */
  getTransfers: (signal?: AbortSignal, teamId?: number) =>
    request<Transfer[]>(`/transfers${teamId ? `?teamId=${teamId}` : ''}`, { signal }),

  getMyTransfers: (signal?: AbortSignal) => request<Transfer[]>('/transfers/me', { signal }),

  registerTransfer: (reservationId: number) =>
    request<Transfer>(`/reservations/${reservationId}/transfer`, { method: 'POST' }),

  cancelTransfer: (transferId: number) => request<void>(`/transfers/${transferId}/cancel`, { method: 'POST' }),

  buyTransfer: (transferId: number, paymentMethod: PaymentMethod) =>
    request<void>(`/transfers/${transferId}/buy`, { method: 'POST', body: { paymentMethod } }),

  /** 메인 슬라이드용 읽기 전용 요약 4가지. 모두 비회원도 부를 수 있다. */
  getHotGames: (limit = 3, signal?: AbortSignal) => request<HotGame[]>(`/games/hot?limit=${limit}`, { signal }),

  getStandings: (signal?: AbortSignal) => request<Standing[]>('/standings', { signal }),

  getHotPosts: (limit = 3, signal?: AbortSignal) =>
    request<HotPost[]>(`/community/hot-posts?limit=${limit}`, { signal }),

  getRecentTransfers: (limit = 3, signal?: AbortSignal) =>
    request<RecentTransfer[]>(`/transfers/recent?limit=${limit}`, { signal }),

  /** 분실물센터. 구장·상태를 주면 그 조건으로 거른다. */
  getLostProperties: (filter: { stadiumName?: string; status?: LostStatus } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (filter.stadiumName) params.set('stadiumName', filter.stadiumName)
    if (filter.status) params.set('status', filter.status)
    const query = params.toString()
    return request<LostProperty[]>(`/lost-properties${query ? `?${query}` : ''}`, { signal })
  },

  getLostStadiums: (signal?: AbortSignal) => request<string[]>('/lost-properties/stadiums', { signal }),

  createLostProperty: (body: LostPropertyInput) =>
    request<LostProperty>('/lost-properties', { method: 'POST', body }),

  /** 관리자 전용. storageLocation을 비우면 이전 보관 장소를 유지한다. */
  updateLostStatus: (id: number, body: { status: LostStatus; storageLocation?: string }) =>
    request<LostProperty>(`/admin/lost-properties/${id}/status`, { method: 'PATCH', body }),

  getNotices: (scope?: NoticeScope, size?: number, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (scope) params.set('scope', scope)
    if (size) params.set('size', String(size))
    const query = params.toString()
    return request<Notice[]>(`/notices${query ? `?${query}` : ''}`, { signal })
  },

  createNotice: (body: NoticeInput) => request<Notice>('/admin/notices', { method: 'POST', body }),

  updateNotice: (noticeId: number, body: NoticeInput) =>
    request<Notice>(`/admin/notices/${noticeId}`, { method: 'PUT', body }),

  deleteNotice: (noticeId: number) => request<void>(`/admin/notices/${noticeId}`, { method: 'DELETE' }),

  /** 구단 게시판의 인기글. 좋아요가 많은 순이고 좋아요가 없는 글은 빠진다. */
  getPopularPosts: (teamId: number, limit = 3, signal?: AbortSignal) =>
    request<PostSummary[]>(`/teams/${teamId}/posts/popular?limit=${limit}`, { signal }),

  getMyTransferWaits: (signal?: AbortSignal) => request<TransferWait[]>('/transfer-waits/me', { signal }),

  registerTransferWait: (gameId: number) =>
    request<TransferWait>(`/games/${gameId}/transfer-waits`, { method: 'POST' }),

  cancelTransferWait: (waitId: number) =>
    request<void>(`/transfer-waits/${waitId}/cancel`, { method: 'POST' }),

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
