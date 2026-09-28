import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { PasswordInput } from '../components/PasswordInput'

const MIN_PASSWORD_LENGTH = 8

/** 비밀번호 변경 화면. 마이페이지 메뉴에서 들어온다. RequireAuth 안에서만 렌더링된다. */
export function PasswordChangePage() {
  return (
    <div className="account">
      <Link to="/my/account" className="account__back">
        ← 마이페이지
      </Link>
      <h1 className="page-title">비밀번호 변경</h1>
      <PasswordChangeForm />
    </div>
  )
}

function PasswordChangeForm() {
  const { applyLoginResult } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  const validate = (): string | null => {
    if (!form.currentPassword) return '현재 비밀번호를 입력해 주세요.'
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.`
    if (form.newPassword !== form.newPasswordConfirm) return '새 비밀번호가 일치하지 않습니다.'
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validate()
    setError(validationError)
    setDone(false)
    if (validationError) return

    setSubmitting(true)
    try {
      const result = await api.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      applyLoginResult(result)
      setForm({ currentPassword: '', newPassword: '', newPasswordConfirm: '' })
      setDone(true)
    } catch (e) {
      setError(errorMessage(e, '비밀번호를 바꾸지 못했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel" aria-label="비밀번호 변경 양식">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">현재 비밀번호</span>
          <PasswordInput
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => update('currentPassword')(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">새 비밀번호</span>
          <PasswordInput
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => update('newPassword')(event.target.value)}
          />
          <span className="field__hint">{MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.</span>
        </label>
        <label className="field">
          <span className="field__label">새 비밀번호 확인</span>
          <PasswordInput
            autoComplete="new-password"
            value={form.newPasswordConfirm}
            onChange={(event) => update('newPasswordConfirm')(event.target.value)}
          />
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="notice notice--success" role="status">
            비밀번호를 바꿨습니다. 다른 기기에서는 모두 로그아웃되었습니다.
          </p>
        )}
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? '바꾸는 중…' : '비밀번호 변경'}
        </button>
      </form>
    </section>
  )
}
