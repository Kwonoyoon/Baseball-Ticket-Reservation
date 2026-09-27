import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { EmptyState, Loading } from '../components/StatusView'
import { useAuth } from './useAuth'

/**
 * 회원(관리자 포함)만 볼 수 있는 화면. 비회원은 로그인 화면으로 보내고, 로그인하면 이 화면으로 돌아온다.
 * 이 화면에서 직접 로그아웃·탈퇴했다면 로그인 화면이 아니라 첫 화면으로 보낸다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, loggedOut } = useAuth()
  const location = useLocation()

  if (loading) return <Loading label="로그인 정보를 확인하는 중…" />
  if (!isAuthenticated) {
    if (loggedOut) return <Navigate to="/" replace />
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return children
}

/** 관리자만 볼 수 있는 화면. 회원에게는 안내만 보여 준다. (서버도 /api/admin/**을 막는다) */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()

  return (
    <RequireAuth>
      {isAdmin ? (
        children
      ) : (
        <EmptyState title="관리자만 볼 수 있는 화면입니다.">
          <Link to="/" className="button button--ghost button--sm">
            경기 일정으로
          </Link>
        </EmptyState>
      )}
    </RequireAuth>
  )
}
