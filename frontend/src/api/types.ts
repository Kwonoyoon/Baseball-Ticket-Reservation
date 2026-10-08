/** 백엔드 API 응답 타입. 날짜(LocalDateTime)는 서울 시간 기준 ISO 문자열이다. */

/** 계정 권한. 로그인하지 않은 방문자(비회원)는 계정이 없으므로 여기에 없다. (auth/roles.ts의 UserType 참고) */
export type MemberRole = 'MEMBER' | 'ADMIN'

export type MemberStatus = 'ACTIVE' | 'LOCKED' | 'WITHDRAWN'

export type Member = {
  id: number
  username: string
  email: string
  name: string
  role: MemberRole
  favoriteTeamId: number | null
}

/** 관리자 회원 관리 화면의 회원 한 명 */
export type AdminMember = {
  id: number
  username: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  failedLoginAttempts: number
  lastLoginAt: string | null
  createdAt: string
}

export type LoginResult = {
  accessToken: string
  tokenType: string
  expiresIn: number
  member: Member
}

export type Team = {
  id: number
  code: string
  name: string
  shortName: string
  primaryColor: string
}

export type Stadium = {
  id: number
  name: string
  city: string
  /** 좌석 배치도를 고르는 구장 코드 (예: JAMSIL). 배치도가 없는 구장은 null */
  code: string | null
}

export type GameStatus = 'SCHEDULED' | 'FINISHED' | 'CANCELED'

export type GameSummary = {
  id: number
  startAt: string
  homeTeam: Team
  awayTeam: Team
  stadium: Stadium
  status: GameStatus
  homeScore: number | null
  awayScore: number | null
}

export type SeatGrade =
  | 'PREMIUM'
  | 'EXCITING'
  | 'TABLE'
  | 'BLUE'
  | 'ORANGE'
  | 'RED'
  | 'NAVY'
  | 'CHEER'
  | 'SKY'
  | 'GRASS'
  | 'PARTY'
  | 'INFIELD'
  | 'OUTFIELD'

export type SeatSection = {
  id: number
  /** 좌석 배치도의 블록 코드 (예: NAVY-05). 배치도가 없는 구장은 null */
  code: string | null
  name: string
  grade: SeatGrade
  gradeLabel: string
  price: number
  seatRows: number
  seatsPerRow: number
}

export type GameDetail = GameSummary & {
  sections: SeatSection[]
}

/** 한 구역의 좌석 현황. 좌석은 "구역ID-열-번호" 키로 표현한다. */
export type SeatStatus = {
  sectionId: number
  soldSeats: string[]
  heldSeats: string[]
  myHeldSeats: string[]
}

/** 구장 화면용 구역별 잔여 현황 (좌석 목록 없이 개수만) */
export type SectionAvailability = {
  sectionId: number
  totalSeats: number
  soldSeats: number
  heldSeats: number
  availableSeats: number
}

export type SeatSummary = {
  sections: SectionAvailability[]
  myHeldSeats: string[]
  /** 내가 이 경기에서 이미 예매한 좌석 수 */
  myReservedSeats: number
  /** 한 회원이 이 경기에서 예매할 수 있는 최대 좌석 수 */
  maxSeatsPerMember: number
}

export type SeatPosition = {
  sectionId: number
  rowNo: number
  seatNo: number
}

export type HoldResult = {
  seats: string[]
  /** UTC Instant ISO 문자열 */
  expiresAt: string
}

export type PaymentMethod = 'CARD' | 'KAKAO_PAY' | 'TOSS_PAY'

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED'

export type ReservedSeat = {
  sectionId: number
  /** 좌석 배치도의 블록 코드. 배치도가 없는 구역은 null */
  sectionCode: string | null
  sectionName: string
  grade: SeatGrade
  rowNo: number
  seatNo: number
  /** 블록 전체 크기. 블록 안 어디에 앉는지 그릴 때 쓴다. */
  seatRows: number
  seatsPerRow: number
  price: number
}

export type NotificationType = 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELED' | 'GAME_CANCELED' | 'TRANSFER_AVAILABLE' | 'TRANSFER_REGISTERED' | 'TRANSFER_CANCELED' | 'TRANSFER_BOUGHT' | 'TRANSFER_SOLD' | 'TRANSFER_WAIT_REGISTERED' | 'TRANSFER_WAIT_CANCELED' | 'TRANSFER_WAIT_POSITION' | 'GENERAL'

export type Notification = {
  id: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  /** 서울 시간 기준 ISO 문자열 */
  createdAt: string
}

export type NotificationPreference = {
  type: NotificationType
  label: string
  /** 여러 알림을 묶은 설정일 때만 값이 있다. */
  description?: string | null
  enabled: boolean
  emailEnabled: boolean
}

export type Reservation = {
  id: number
  reservationNumber: string
  status: ReservationStatus
  totalPrice: number
  paymentMethod: PaymentMethod
  createdAt: string
  canceledAt: string | null
  cancelable: boolean
  /** 결제 대기(PENDING)일 때만 값이 있다. 이 시각까지 결제창에서 결제를 마쳐야 한다. */
  paymentDeadline: string | null
  game: GameSummary
  seats: ReservedSeat[]
}

export type TransferStatus = 'OPEN' | 'SOLD' | 'CANCELED'

/** 정가 양도글 한 건. 판매자 이름은 서버가 가려서(홍**) 내려 준다. */
export type Transfer = {
  id: number
  status: TransferStatus
  price: number
  createdAt: string
  /** 내가 올린 글인지 */
  mine: boolean
  sellerName: string
  game: GameSummary
  seats: string[]
  /** 지금이 대기자 우선 구매 시간이면 그 시간이 끝나는 때. 아니면 null */
  exclusiveUntil: string | null
  /** 우선 구매 시간의 주인이 나인지. 우선 구매 시간에 false이면 살 수 없다 */
  exclusiveForMe: boolean
}

/** 양도 대기. position은 같은 경기 대기자 중 내 순서(1부터)다. */
export type TransferWait = {
  id: number
  createdAt: string
  position: number
  game: GameSummary
}

/** 메인 슬라이드 "매진 임박": 판매 좌석 수 ÷ 전체 좌석 수가 예매율이다. */
export type HotGame = {
  game: GameSummary
  soldSeats: number
  totalSeats: number
}

/** 순위표 한 줄. 승률은 무승부를 뺀 승 ÷ (승 + 패), 승차는 선두와의 차이다. */
export type Standing = {
  rank: number
  team: Team
  wins: number
  losses: number
  draws: number
  winPct: number
  gamesBehind: number
}

/** 메인 슬라이드 "지금 뜨는 커뮤니티"의 글 한 줄 */
export type HotPost = {
  id: number
  team: Team
  category: PostCategory | null
  title: string
  likeCount: number
  commentCount: number
}

/** 메인 슬라이드 "방금 올라온 티켓 양도"의 한 줄. 판매자 정보는 없다. */
export type RecentTransfer = {
  id: number
  price: number
  game: GameSummary
  seatCount: number
  sectionName: string | null
}

/** 분실물 상태: 접수 → 보관 중 → 수령 완료 / 폐기 */
export type LostStatus = 'REPORTED' | 'KEEPING' | 'CLAIMED' | 'DISCARDED'

export type LostProperty = {
  id: number
  title: string
  description: string
  stadiumName: string
  specificLocation: string | null
  category: string
  imageUrl: string | null
  /** 보관 장소. 관리자가 정하기 전에는 null */
  storageLocation: string | null
  status: LostStatus
  lostOrFoundDate: string | null
  createdAt: string
}

export type LostPropertyInput = {
  title: string
  description: string
  stadiumName: string
  specificLocation?: string
  category: string
  imageUrl?: string
  lostOrFoundDate?: string
}

/** 공지가 뜨는 자리: 헤더 메뉴의 전체 공지 / 커뮤니티 게시판 맨 위 */
export type NoticeScope = 'GLOBAL' | 'COMMUNITY'

/** 공지 종류: 시스템 업데이트 · 이벤트 · 점검 */
export type NoticeCategory = 'UPDATE' | 'EVENT' | 'MAINTENANCE'

export type Notice = {
  id: number
  scope: NoticeScope
  category: NoticeCategory
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type NoticeInput = {
  scope: NoticeScope
  category: NoticeCategory
  title: string
  content: string
}

export type TeamPostCount = {
  teamId: number
  postCount: number
}

/** 게시판 안의 글 분류 (자유·경기·응원·티켓 양도) */
export type PostCategory = 'FREE' | 'GAME' | 'CHEER' | 'TICKET_TRANSFER'

export type PostSummary = {
  id: number
  category: PostCategory
  authorName: string
  title: string
  /** 본문 앞부분을 한 줄로 합쳐 자른 것 */
  preview: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
}

export type PostPage = {
  items: PostSummary[]
  hasMore: boolean
  /** 지금 쪽 (서버 기준 0부터) */
  page: number
  size: number
  /** 분류·검색어 조건에 맞는 전체 글 수 */
  totalCount: number
  /** 전체 쪽 수. 글이 없으면 0 */
  totalPages: number
}

export type PostDetail = {
  id: number
  teamId: number
  category: PostCategory
  authorId: number
  authorName: string
  title: string
  content: string
  viewCount: number
  likeCount: number
  commentCount: number
  liked: boolean
  mine: boolean
  createdAt: string
  updatedAt: string
}

export type Comment = {
  id: number
  authorId: number
  authorName: string
  content: string
  mine: boolean
  createdAt: string
}

export type LikeResult = {
  liked: boolean
  likeCount: number
}

export type ReportTargetType = 'POST' | 'COMMENT'

export type Report = {
  id: number
  targetType: ReportTargetType
  targetId: number
  /** 신고 대상이 이미 지워졌으면 null */
  targetPreview: string | null
  targetAuthorName: string | null
  reporterName: string
  reason: string
  createdAt: string
}

/**
 * 내 티켓의 입장 정보 (POST /api/reservations/{id}/entry-ticket). 시각은 서울 시간이다.
 * token은 서버가 서명한 입장 QR 값으로, 화면은 그대로 QR로 그리기만 한다. 끝났거나 취소된 경기, 이미 입장한 예매는 null.
 */
export type EntryTicket = {
  /** 입장 시작 (평일 1시간 30분 전, 주말·공휴일 2시간 전) */
  entryOpensAt: string
  gameStartsAt: string
  /** 이 시각부터 끝난 경기로 본다. */
  gameEndsAt: string
  token: string | null
  /** token이 유효한 초. 지나면 새로 받는다. */
  expiresInSeconds: number | null
  /** 입장 게이트에서 입장 확인된 시각. 입장 전이면 null (한 번 입장하면 다시 들어올 수 없다) */
  enteredAt: string | null
}

/** 입장 QR 검증 결과. ADMITTED일 때만 입장시킨다. */
export type EntryVerifyResult =
  | 'ADMITTED'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'NOT_CONFIRMED'
  | 'GAME_CANCELED'
  | 'NOT_YET_OPEN'
  | 'GAME_OVER'
  | 'ALREADY_ENTERED'
  /** 양도로 주인이 바뀌기 전에 받아 둔 QR */
  | 'OWNER_CHANGED'
  /** 양도 마켓에 올라가 있는 티켓. 양도를 취소해야 입장할 수 있다. */
  | 'LISTED_FOR_TRANSFER'

/**
 * 입장 게이트의 QR 검증 응답 (POST /api/admin/entry/verify). 입장 여부와 상관없이 200으로 온다.
 * ADMITTED면 서버가 그 자리에서 입장 처리하고, 같은 예매는 다시 입장할 수 없다(ALREADY_ENTERED).
 * reservation·entryOpensAt은 서명이 맞고 예매를 찾았을 때만 값이 있다. 시각은 서울 시간이다.
 */
export type EntryVerification = {
  admitted: boolean
  result: EntryVerifyResult
  /** 게이트 직원에게 보여 줄 안내 문구 */
  message: string
  reservation: Reservation | null
  entryOpensAt: string | null
  /** 입장 확인된 시각. 이번에 입장했거나(ADMITTED) 이미 입장한 예매(ALREADY_ENTERED)일 때만 값이 있다. */
  enteredAt: string | null
}
