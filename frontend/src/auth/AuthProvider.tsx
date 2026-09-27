import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { endSession, hasSessionHint, onSessionChange, refreshSession, startSession } from '../api/client'
import { api } from '../api/endpoints'
import type { LoginResult, Member } from '../api/types'
import { AuthContext, type AuthContextValue } from './authContext'
import { userTypeOf } from './roles'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null)
  // 로그인했던 브라우저면 리프레시 쿠키로 세션을 복원할 때까지 기다린다.
  const [loading, setLoading] = useState(hasSessionHint)
  const [loggedOut, setLoggedOut] = useState(false)

  useEffect(
    () =>
      onSessionChange((next) => {
        setMember(next)
        if (next) setLoggedOut(false)
      }),
    [],
  )

  useEffect(() => {
    if (!hasSessionHint()) return
    let active = true
    refreshSession().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string, autoLogin = false) => {
    const result = await api.login({ username, password, autoLogin })
    startSession(result)
    return result.member
  }, [])

  const logout = useCallback(async () => {
    setLoggedOut(true)
    endSession()
    try {
      await api.logout()
    } catch {
      // 서버에 닿지 않아도 이 화면에서는 로그아웃된 상태다. 쿠키는 만료되면 사라진다.
    }
  }, [])

  const applyLoginResult = useCallback((result: LoginResult) => startSession(result), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      member,
      userType: userTypeOf(member),
      isAuthenticated: member !== null,
      isAdmin: member?.role === 'ADMIN',
      loading,
      loggedOut,
      login,
      logout,
      applyLoginResult,
    }),
    [member, loading, loggedOut, login, logout, applyLoginResult],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
