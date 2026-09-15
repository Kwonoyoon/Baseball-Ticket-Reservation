import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { safeRedirect } from '../auth/redirect'
import { useAuth } from '../auth/useAuth'
import { AuthCard } from '../components/AuthCard'

const MIN_PASSWORD_LENGTH = 8

export function SignupPage() {
  const { login, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))

  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to={redirect} replace />

  const update = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  const validate = (): string | null => {
    if (!form.name.trim()) return '이름을 입력해 주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return '이메일 형식이 올바르지 않습니다.'
    if (form.password.length < MIN_PASSWORD_LENGTH) return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.`
    if (form.password !== form.passwordConfirm) return '비밀번호가 일치하지 않습니다.'
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validate()
    setError(validationError)
    if (validationError) return

    setSubmitting(true)
    try {
      const email = form.email.trim()
      await api.signup({ name: form.name.trim(), email, password: form.password })
      await login(email, form.password)
    } catch (e) {
      setError(errorMessage(e, '회원가입에 실패했습니다.'))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="회원가입"
      description="가입하고 좋아하는 구단의 경기를 예매해 보세요."
      footer={
        <>
          이미 계정이 있으신가요? <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>로그인</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">이름</span>
          <input autoComplete="name" value={form.name} onChange={(event) => update('name')(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email')(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update('password')(event.target.value)}
          />
          <span className="field__hint">{MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.</span>
        </label>
        <label className="field">
          <span className="field__label">비밀번호 확인</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={(event) => update('passwordConfirm')(event.target.value)}
          />
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary button--block" disabled={submitting}>
          {submitting ? '가입 중…' : '가입하기'}
        </button>
      </form>
    </AuthCard>
  )
}
