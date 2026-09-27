import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { USER_TYPE_LABELS } from '../auth/roles'
import { useAuth } from '../auth/useAuth'

const MIN_PASSWORD_LENGTH = 8

/** 마이페이지: 내 정보, 비밀번호 변경, 회원 탈퇴. RequireAuth 안에서만 렌더링된다. */
export function AccountPage() {
  const { member, userType } = useAuth()

  if (!member) return null

  return (
    <div className="account">
      <h1 className="page-title">마이페이지</h1>

      <section className="panel" aria-labelledby="account-info-title">
        <div className="panel__header">
          <h2 id="account-info-title" className="panel__title">
            내 정보
          </h2>
          <span className={`badge badge--role-${userType.toLowerCase()}`}>{USER_TYPE_LABELS[userType]}</span>
        </div>
        <dl className="info-list">
          <dt>아이디</dt>
          <dd>{member.username}</dd>
          <dt>이름</dt>
          <dd>{member.name}</dd>
          <dt>이메일</dt>
          <dd>{member.email}</dd>
        </dl>
      </section>

      <PasswordChangeForm />
      {member.role !== 'ADMIN' && <WithdrawForm />}
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
    <section className="panel" aria-labelledby="password-title">
      <div className="panel__header">
        <h2 id="password-title" className="panel__title">
          비밀번호 변경
        </h2>
      </div>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">현재 비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => update('currentPassword')(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">새 비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => update('newPassword')(event.target.value)}
          />
          <span className="field__hint">{MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.</span>
        </label>
        <label className="field">
          <span className="field__label">새 비밀번호 확인</span>
          <input
            type="password"
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
    <section className="panel" aria-labelledby="withdraw-title">
      <div className="panel__header">
        <h2 id="withdraw-title" className="panel__title">
          회원 탈퇴
        </h2>
      </div>
      <p className="panel__subtitle">
        관람 예정인 예매가 있으면 먼저 취소해야 합니다. 지난 예매 기록은 남고, 이름과 이메일은 삭제됩니다.
      </p>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field__label">비밀번호 확인</span>
          <input
            type="password"
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
