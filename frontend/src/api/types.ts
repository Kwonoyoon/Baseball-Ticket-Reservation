/** 백엔드 API 응답 타입. 날짜(LocalDateTime)는 서울 시간 기준 ISO 문자열이다. */

export type Member = {
  id: number
  email: string
  name: string
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

export type GameSummary = {
  id: number
  startAt: string
  homeTeam: Team
  awayTeam: Team
  stadium: Stadium
}

export type SeatGrade = 'PREMIUM' | 'TABLE' | 'INFIELD' | 'OUTFIELD'

export type SeatSection = {
  id: number
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

/** 좌석은 "구역ID-열-번호" 키로 표현한다. */
export type SeatStatus = {
  soldSeats: string[]
  heldSeats: string[]
  myHeldSeats: string[]
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
  sectionName: string
  grade: SeatGrade
  rowNo: number
  seatNo: number
  price: number
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
