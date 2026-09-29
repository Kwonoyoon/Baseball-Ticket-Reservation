import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { PasswordInput } from '../components/PasswordInput'

const MAX_NAME_LENGTH = 50
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 프로필 수정 화면. 이름과 이메일을 바꾼다. 아이디는 바꿀 수 없다. 마이페이지 메뉴에서 들어온다. */
export function ProfileEditPage() {
  return (
    <div className="account">
      <Link to="/my/account" className="account__back">
        ← 마이페이지
      </Link>
      <h1 className="page-title">프로필 수정</h1>
      <ProfileEditForm />
    </div>
  )
}

function ProfileEditForm() {
  const { member, updateMember } = useAuth()
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!member) return null

  const validate = (): string | null => {
    if (!name.trim()) return '이름을 입력해 주세요.'
    if (name.trim().length > MAX_NAME_LENGTH) return `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.`
    if (!EMAIL_PATTERN.test(email.trim())) return '이메일 형식이 올바르지 않습니다.'
    if (!currentPassword) return '현재 비밀번호를 입력해 주세요.'
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
      updateMember(await api.updateProfile({ name: name.trim(), email: email.trim(), currentPassword }))
      setCurrentPassword('')
      setDone(true)
    } catch (e) {
      setError(errorMessage(e, '프로필을 수정하지 못했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel" aria-label="프로필 수정 양식">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <span className="field__label">아이디</span>
          <span className="field__static">{member.username}</span>
          <span className="field__hint">아이디는 바꿀 수 없습니다.</span>
        </div>
        <label className="field">
          <span className="field__label">이름</span>
          <input
            type="text"
            autoComplete="name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">현재 비밀번호</span>
          <PasswordInput
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <span className="field__hint">본인 확인을 위해 현재 비밀번호를 입력해 주세요.</span>
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="notice notice--success" role="status">
            프로필을 수정했습니다.
          </p>
        )}
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? '저장하는 중…' : '저장'}
        </button>
      </form>
    </section>
  )
}
