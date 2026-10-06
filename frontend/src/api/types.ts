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

export type NotificationType = 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELED' | 'GAME_CANCELED' | 'TRANSFER_AVAILABLE' | 'GENERAL'

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
