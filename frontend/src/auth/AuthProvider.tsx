import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_EXPIRED_EVENT, loadStoredAuth, saveStoredAuth, type StoredAuth } from '../api/client'
import { api } from '../api/endpoints'
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

  useEffect(() => {
    if (!auth) return
    const remaining = auth.expiresAt - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    const timer = window.setTimeout(logout, remaining)
    return () => window.clearTimeout(timer)
  }, [auth, logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      member: auth?.member ?? null,
      isAuthenticated: auth !== null,
      expiresAt: auth?.expiresAt ?? null,
      login,
      logout,
    }),
    [auth, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
