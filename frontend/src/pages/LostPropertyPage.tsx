import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { LostProperty, LostPropertyInput, LostStatus } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'
import { isWebImage, LOST_CATEGORIES, LOST_STATUS_LABELS, LOST_STATUSES } from '../lib/lostProperty'
import './LostPropertyPage.css'

const emptyForm = (stadiumName = ''): LostPropertyInput => ({
  title: '',
  description: '',
  stadiumName,
  specificLocation: '',
  category: LOST_CATEGORIES[0],
  imageUrl: '',
  lostOrFoundDate: '',
})

/**
 * 분실물센터. 구장에서 잃어버렸거나 주운 물건을 등록하고, 구장·상태로 걸러 본다.
 * 등록·조회는 로그인한 회원 누구나 하고, 접수 → 보관 중 → 수령 완료·폐기로 바꾸는 일은 관리자만 한다. (서버도 막는다)
 */
export function LostPropertyPage() {
  const { isAdmin } = useAuth()
  const [stadiums, setStadiums] = useState<string[]>([])
  const [stadiumFilter, setStadiumFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<LostStatus | ''>('')
  const [items, setItems] = useState<LostProperty[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState<LostPropertyInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getLostStadiums(controller.signal)
      .then(setStadiums)
      .catch(() => setStadiums([]))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getLostProperties(
        { stadiumName: stadiumFilter || undefined, status: statusFilter || undefined },
        controller.signal,
      )
      .then(setItems)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '분실물 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [stadiumFilter, statusFilter, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setFormError(null)
    try {
      await api.createLostProperty({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        // 비워 둔 선택 항목은 아예 보내지 않는다.
        specificLocation: form.specificLocation?.trim() || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
        lostOrFoundDate: form.lostOrFoundDate || undefined,
      })
      setNotice('분실물을 등록했어요. 관리자가 확인하면 보관 상태가 바뀝니다.')
      setForm(null)
      reload()
    } catch (e) {
      setFormError(errorMessage(e, '분실물을 등록하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusSaved = (updated: LostProperty) => {
    setItems((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? null)
    setNotice('상태를 바꿨어요.')
  }

  const handleDeleted = (id: number) => {
    setItems((current) => current?.filter((item) => item.id !== id) ?? null)
    setNotice('분실물을 지웠어요.')
  }

  return (
    <div className="lost-page">
      <div className="lost-page__head">
        <h1 className="page-title">분실물센터</h1>
        {!form && (
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => {
              setNotice(null)
              setForm(emptyForm(stadiumFilter))
            }}
          >
            분실물 등록
          </button>
        )}
      </div>
      <p className="lost-page__intro">구장에서 잃어버렸거나 주운 물건을 등록하고, 내 물건이 있는지 찾아보세요.</p>

      {notice && (
        <p className="notice notice--success" role="status">
          {notice}
        </p>
      )}

      {form && (
        <form className="lost-form" aria-label="분실물 등록" onSubmit={handleSubmit}>
          <h2 className="lost-page__heading">분실물 등록</h2>
          <div className="lost-form__row">
            <label className="field">
              <span className="field__label">구장</span>
              <select
                value={form.stadiumName}
                onChange={(e) => setForm({ ...form, stadiumName: e.target.value })}
                required
              >
                <option value="" disabled>
                  구장을 골라 주세요
                </option>
                {stadiums.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">분류</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {LOST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field__label">제목</span>
            <input
              value={form.title}
              maxLength={100}
              placeholder="예: 검은색 지갑"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">상세 설명</span>
            <textarea
              value={form.description}
              rows={4}
              maxLength={4000}
              placeholder="물건의 특징, 잃어버린(주운) 상황을 적어 주세요."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>
          <div className="lost-form__row">
            <label className="field">
              <span className="field__label">세부 위치 (선택)</span>
              <input
                value={form.specificLocation ?? ''}
                maxLength={255}
                placeholder="예: 1루 블루석 12열"
                onChange={(e) => setForm({ ...form, specificLocation: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">분실·습득한 때 (선택)</span>
              <input
                type="datetime-local"
                value={form.lostOrFoundDate ?? ''}
                onChange={(e) => setForm({ ...form, lostOrFoundDate: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">사진 주소 (선택)</span>
            <input
              type="url"
              value={form.imageUrl ?? ''}
              maxLength={500}
              placeholder="https://..."
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </label>
          {formError && (
            <p className="form__error" role="alert">
              {formError}
            </p>
          )}
          <div className="lost-form__actions">
            <button type="submit" className="button button--primary button--sm" disabled={saving}>
              {saving ? '등록 중…' : '등록하기'}
            </button>
            <button type="button" className="button button--ghost button--sm" onClick={() => setForm(null)}>
              취소
            </button>
          </div>
        </form>
      )}

      <div className="lost-filter" role="group" aria-label="분실물 거르기">
        <label>
          구장
          <select value={stadiumFilter} onChange={(e) => setStadiumFilter(e.target.value)}>
            <option value="">전체</option>
            {stadiums.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          상태
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LostStatus | '')}>
            <option value="">전체</option>
            {LOST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LOST_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            reload()
          }}
        />
      ) : items === null ? (
        <Loading label="분실물을 불러오는 중…" />
      ) : items.length === 0 ? (
        <EmptyState title="등록된 분실물이 없어요." description="잃어버렸거나 주운 물건이 있다면 등록해 주세요." />
      ) : (
        <ul className="lost-list">
          {items.map((item) => (
            <LostCard key={item.id} item={item} isAdmin={isAdmin} onSaved={handleStatusSaved} onDeleted={handleDeleted} />
          ))}
        </ul>
      )}
    </div>
  )
}

function LostCard({
  item,
  isAdmin,
  onSaved,
  onDeleted,
}: {
  item: LostProperty
  isAdmin: boolean
  onSaved: (updated: LostProperty) => void
  onDeleted: (id: number) => void
}) {
  const [status, setStatus] = useState<LostStatus>(item.status)
  const [storage, setStorage] = useState(item.storageLocation ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 올린 본인이나 관리자만 지울 수 있다. 서버도 같은 규칙으로 막는다. (이 버튼은 보여 줄지만 정한다)
  const canDelete = isAdmin || item.mine

  const remove = async () => {
    if (!window.confirm(`"${item.title}" 분실물을 지울까요?`)) return
    setDeleting(true)
    setError(null)
    try {
      await api.deleteLostProperty(item.id)
      onDeleted(item.id)
    } catch (e) {
      setError(errorMessage(e, '분실물을 지우지 못했습니다.'))
      setDeleting(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      onSaved(await api.updateLostStatus(item.id, { status, storageLocation: storage.trim() || undefined }))
    } catch (e) {
      setError(errorMessage(e, '상태를 바꾸지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="lost-card">
      {isWebImage(item.imageUrl) && <img className="lost-card__image" src={item.imageUrl} alt="" loading="lazy" />}
      <div className="lost-card__main">
        <div className="lost-card__tags">
          <span className="lost-chip">{item.category}</span>
          <span className={`lost-chip lost-chip--${item.status.toLowerCase()}`}>{LOST_STATUS_LABELS[item.status]}</span>
        </div>
        <h2 className="lost-card__title">{item.title}</h2>
        <p className="lost-card__place">
          {item.stadiumName}
          {item.specificLocation && ` · ${item.specificLocation}`}
        </p>
        <p className="lost-card__desc">{item.description}</p>
        <p className="lost-card__meta">
          {item.lostOrFoundDate && <span>분실·습득 {formatDateTime(item.lostOrFoundDate)}</span>}
          <span>등록 {formatDateTime(item.createdAt)}</span>
          {item.storageLocation && <span>보관 장소 {item.storageLocation}</span>}
        </p>

        {isAdmin && (
          <div className="lost-card__admin">
            <select
              aria-label={`${item.title} 상태`}
              value={status}
              onChange={(e) => setStatus(e.target.value as LostStatus)}
            >
              {LOST_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {LOST_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <input
              aria-label={`${item.title} 보관 장소`}
              value={storage}
              maxLength={255}
              placeholder="보관 장소 (예: 1층 안내소)"
              onChange={(e) => setStorage(e.target.value)}
            />
            <button type="button" className="button button--ghost button--sm" disabled={saving} onClick={save}>
              {saving ? '저장 중…' : '상태 저장'}
            </button>
          </div>
        )}

        {canDelete && (
          <div className="lost-card__actions">
            <button
              type="button"
              className="button button--danger button--sm"
              aria-label={`${item.title} 삭제`}
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? '지우는 중…' : '삭제'}
            </button>
          </div>
        )}
        {error && (
          <span className="form__error" role="alert">
            {error}
          </span>
        )}
      </div>
    </li>
  )
}
