import type { Member } from '../api/types'

/**
 * 화면에서 구분하는 사용자 종류.
 * - GUEST(비회원): 로그인하지 않은 방문자. 경기 일정과 좌석 현황만 볼 수 있다.
 * - MEMBER(회원): 좌석 선택·예매·예매 내역·마이페이지
 * - ADMIN(관리자): 회원 기능 + 회원 관리
 * 실제 접근 제어는 서버가 한다. 여기서는 화면에 무엇을 보여 줄지만 정한다.
 */
export type UserType = 'GUEST' | 'MEMBER' | 'ADMIN'

export const USER_TYPE_LABELS: Record<UserType, string> = {
  GUEST: '비회원',
  MEMBER: '회원',
  ADMIN: '관리자',
}

export function userTypeOf(member: Member | null): UserType {
  return member ? member.role : 'GUEST'
}
