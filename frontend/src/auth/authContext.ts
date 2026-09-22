import { createContext } from 'react'
import type { Member } from '../api/types'

export type AuthContextValue = {
  member: Member | null
  isAuthenticated: boolean
  /** 로그인 세션이 만료되는 시각 (epoch milliseconds). 로그인 상태가 아니면 null */
  expiresAt: number | null
  login: (email: string, password: string) => Promise<Member>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
