import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { PasswordInput } from '../components/PasswordInput'

/** 회원 탈퇴 화면. 마이페이지 메뉴에서 들어온다. 관리자는 탈퇴할 수 없어 마이페이지로 돌려보낸다. */
export function WithdrawPage() {
  const { member } = useAuth()
  if (member?.role === 'ADMIN') return <Navigate to="/my/account" replace />

  return (
    <div className="account">
      <Link to="/my/account" className="account__back">
        ← 마이페이지
      </Link>
      <h1 className="page-title">회원 탈퇴</h1>
      <WithdrawForm />
    </div>
  )
}

function WithdrawForm() {
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password) {
      setError('비밀번호를 입력해 주세요.')
      return
    }
    const confirmed = window.confirm('정말 탈퇴할까요?\n아이디는 다시 사용할 수 없고, 이름과 이메일은 삭제됩니다.')
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    try {
      await api.withdraw(password)
      // 직접 로그아웃했으므로 RequireAuth가 첫 화면으로 보낸다.
      await logout()
    } catch (e) {
      setError(errorMessage(e, '탈퇴하지 못했습니다.'))
      setSubmitting(false)
    }
  }

  return (
    <section className="panel" aria-label="회원 탈퇴 양식">
      <p className="panel__subtitle">
        관람 예정인 예매가 있으면 먼저 취소해야 합니다. 지난 예매 기록은 남고, 이름과 이메일은 삭제됩니다.
      </p>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">비밀번호 확인</span>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--danger" disabled={submitting}>
          {submitting ? '탈퇴 처리 중…' : '회원 탈퇴'}
        </button>
      </form>
    </section>
  )
}
