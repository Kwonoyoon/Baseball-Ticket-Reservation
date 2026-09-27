import { createContext } from 'react'
import type { Member } from '../api/types'

export type AuthContextValue = {
  member: Member | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<Member>
  logout: () => void
  updateMember: (member: Member) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
