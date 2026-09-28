import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { AdminMember, MemberRole, MemberStatus } from '../api/types'
import { USER_TYPE_LABELS } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { RoleSelect } from '../components/RoleSelect'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'

const STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: '정상',
  LOCKED: '잠김',
  WITHDRAWN: '탈퇴',
}

type Notice = { type: 'success' | 'error'; message: string }

/** 관리자 회원 관리: 검색, 잠금/해제, 권한 변경. 본인 계정은 바꿀 수 없다. (서버도 막는다) */
export function AdminMembersPage() {
  const { member: me } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [members, setMembers] = useState<AdminMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getAdminMembers(appliedKeyword, controller.signal)
      .then(setMembers)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '회원 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [appliedKeyword, reloadKey])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setAppliedKeyword(keyword.trim())
  }

  const runAction = async (target: AdminMember, action: () => Promise<AdminMember>, successMessage: string) => {
    setBusyId(target.id)
    setNotice(null)
    try {
      const updated = await action()
      setMembers((current) => current?.map((m) => (m.id === updated.id ? updated : m)) ?? null)
      setNotice({ type: 'success', message: successMessage })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '처리하지 못했습니다.') })
    } finally {
      setBusyId(null)
    }
  }

  const toggleLock = (target: AdminMember) => {
    if (target.status === 'LOCKED') {
      void runAction(target, () => api.unlockMember(target.id), `${target.username}의 잠금을 풀었습니다.`)
      return
    }
    if (!window.confirm(`${target.username} 계정을 잠글까요?\n모든 기기에서 즉시 로그아웃됩니다.`)) return
    void runAction(target, () => api.lockMember(target.id), `${target.username} 계정을 잠갔습니다.`)
  }

  /** 삭제한 회원은 목록에서 바로 뺀다. (서버도 다음 조회부터 내려 주지 않는다) */
  const deleteMember = async (target: AdminMember) => {
    const ok = window.confirm(
      `${target.username} 회원을 삭제할까요?` +
        `\n이름과 이메일은 지워지고, 예매 이력은 통계를 위해 남습니다.` +
        `\n되돌릴 수 없습니다.`,
    )
    if (!ok) return
    setBusyId(target.id)
    setNotice(null)
    try {
      await api.deleteMember(target.id)
      setMembers((current) => current?.filter((m) => m.id !== target.id) ?? null)
      setNotice({ type: 'success', message: `${target.username} 회원을 삭제했습니다.` })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '삭제하지 못했습니다.') })
    } finally {
      setBusyId(null)
    }
  }

  const changeRole = (target: AdminMember, role: MemberRole) => {
    if (role === target.role) return
    if (!window.confirm(`${target.username}의 권한을 '${USER_TYPE_LABELS[role]}'(으)로 바꿀까요?`)) return
    void runAction(
      target,
      () => api.changeMemberRole(target.id, role),
      `${target.username}의 권한을 ${USER_TYPE_LABELS[role]}(으)로 바꿨습니다.`,
    )
  }

  return (
    <div className="admin-members">
      <h1 className="page-title">회원 관리</h1>

      <form className="admin-search" role="search" onSubmit={handleSearch}>
        <label className="field">
          <span className="field__label">검색</span>
          <input
            type="search"
            placeholder="아이디, 이름, 이메일"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <button type="submit" className="button button--primary">
          검색
        </button>
      </form>

      {notice && (
        <p className={`notice${notice.type === 'success' ? ' notice--success' : ''}`} role="status">
          {notice.message}
        </p>
      )}

      {error ? (
        <ErrorMessage message={error} onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }} />
      ) : members === null ? (
        <Loading />
      ) : members.length === 0 ? (
        <EmptyState title="조건에 맞는 회원이 없습니다." />
      ) : (
        <div className="admin-table__scroll">
          <table className="admin-table">
            <caption className="sr-only">회원 목록 {members.length}명</caption>
            <thead>
              <tr>
                <th scope="col">아이디</th>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">권한</th>
                <th scope="col">상태</th>
                <th scope="col">최근 로그인</th>
                <th scope="col">가입일</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {members.map((target) => {
                const isSelf = target.id === me?.id
                const withdrawn = target.status === 'WITHDRAWN'
                const disabled = isSelf || withdrawn || busyId === target.id
                return (
                  <tr key={target.id} className={withdrawn ? 'admin-table__row--muted' : undefined}>
                    <td>
                      {target.username}
                      {isSelf && <span className="admin-table__self">나</span>}
                    </td>
                    <td>{target.name}</td>
                    <td>{withdrawn ? '-' : target.email}</td>
                    <td>
                      <RoleSelect
                        label={`${target.username} 권한`}
                        value={target.role}
                        disabled={disabled}
                        onChange={(role) => changeRole(target, role)}
                      />
                    </td>
                    <td>
                      <span className={`badge badge--status-${target.status.toLowerCase()}`}>
                        {STATUS_LABELS[target.status]}
                      </span>
                      {target.failedLoginAttempts > 0 && target.status !== 'WITHDRAWN' && (
                        <small className="admin-table__hint">실패 {target.failedLoginAttempts}회</small>
                      )}
                    </td>
                    <td>{target.lastLoginAt ? formatDateTime(target.lastLoginAt) : '-'}</td>
                    <td>{formatDateTime(target.createdAt)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          type="button"
                          className={`button button--sm ${
                            target.status === 'LOCKED' ? 'button--ghost' : 'button--danger'
                          }`}
                          disabled={disabled}
                          onClick={() => toggleLock(target)}
                        >
                          {target.status === 'LOCKED' ? '잠금 해제' : '잠금'}
                        </button>
                        <button
                          type="button"
                          className="button button--sm button--danger"
                          disabled={disabled || target.role === 'ADMIN'}
                          onClick={() => void deleteMember(target)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
