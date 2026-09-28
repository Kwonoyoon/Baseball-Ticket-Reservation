import { createContext } from 'react'
import type { LoginResult, Member } from '../api/types'
import type { UserType } from './roles'

export type AuthContextValue = {
  member: Member | null
  userType: UserType
  isAuthenticated: boolean
  isAdmin: boolean
  /** 새로고침 직후 로그인 상태를 복원하는 중 */
  loading: boolean
  /** 직접 로그아웃(또는 탈퇴)해서 비회원이 되었는지. 세션 만료와 구분해 로그인 화면 대신 첫 화면으로 보낸다. */
  loggedOut: boolean
  login: (username: string, password: string, autoLogin?: boolean) => Promise<Member>
  logout: () => Promise<void>
  /** 비밀번호 변경처럼 서버가 새 토큰을 준 경우 세션을 바꾼다. */
  applyLoginResult: (result: LoginResult) => void
  /** 관심 구단처럼 로그인 후 바뀌는 회원 정보를 화면 상태에 반영한다. (서버는 이미 저장한 뒤) */
  updateMember: (member: Member) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
