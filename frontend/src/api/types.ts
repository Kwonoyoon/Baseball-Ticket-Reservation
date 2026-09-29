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

export type NotificationType = 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELED' | 'GENERAL'

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
  game: GameSummary
  seats: ReservedSeat[]
}
