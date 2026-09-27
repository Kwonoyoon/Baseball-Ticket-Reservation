import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { errorMessage } from '../api/client'
import { safeRedirect } from '../auth/redirect'
import { useAuth } from '../auth/useAuth'
import { AuthCard } from '../components/AuthCard'
import { PasswordInput } from '../components/PasswordInput'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [autoLogin, setAutoLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to={redirect} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password, autoLogin)
    } catch (e) {
      setError(errorMessage(e, '로그인에 실패했습니다.'))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="로그인"
      description="좌석 예매와 예매 내역 확인을 위해 로그인해 주세요."
      footer={
        <>
          아직 회원이 아니신가요? <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`}>회원가입</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">아이디</span>
          <input
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">비밀번호</span>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={autoLogin} onChange={(event) => setAutoLogin(event.target.checked)} />
          <span>자동 로그인</span>
          <small>공용 PC에서는 사용하지 마세요.</small>
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary button--block" disabled={submitting || !username.trim() || !password}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </AuthCard>
  )
}
