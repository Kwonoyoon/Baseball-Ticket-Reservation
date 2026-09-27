import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_EXPIRED_EVENT, loadStoredAuth, saveStoredAuth, type StoredAuth } from '../api/client'
import { api } from '../api/endpoints'
import type { Member } from '../api/types'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => loadStoredAuth())

  const logout = useCallback(() => {
    saveStoredAuth(null)
    setAuth(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password })
    const stored: StoredAuth = {
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      member: result.member,
    }
    saveStoredAuth(stored)
    setAuth(stored)
    return result.member
  }, [])

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout)
  }, [logout])

  // 관심 구단처럼 로그인 이후 바뀌는 회원 정보를 저장된 인증 정보에 반영한다.
  const updateMember = useCallback((member: Member) => {
    setAuth((current) => {
      if (!current) return current
      const next = { ...current, member }
      saveStoredAuth(next)
      return next
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ member: auth?.member ?? null, isAuthenticated: auth !== null, login, logout, updateMember }),
    [auth, login, logout, updateMember],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
