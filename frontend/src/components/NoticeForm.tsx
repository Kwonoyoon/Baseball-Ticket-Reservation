import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { Notice, NoticeCategory, NoticeInput, NoticeScope } from '../api/types'
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABELS, NOTICE_SCOPE_LABELS, NOTICE_SCOPES } from '../lib/notice'
import '../pages/NoticesPage.css'

type NoticeFormProps = {
  /** 고칠 공지. 없으면 새 공지를 쓴다. */
  notice?: Notice | null
  /** 정하면 "뜨는 자리"를 고르는 칸을 숨기고 그 자리로 고정한다. (커뮤니티 화면에서 쓸 때) */
  fixedScope?: NoticeScope
  /** 저장에 성공하면 알림 문구와 함께 부른다. */
  onSaved: (message: string) => void
  onCancel: () => void
}

/**
 * 공지 쓰기·수정 폼. 관리자만 쓰며(서버도 관리자만 허용한다), 전체 공지 화면과 커뮤니티 화면이 같이 쓴다.
 */
export function NoticeForm({ notice = null, fixedScope, onSaved, onCancel }: NoticeFormProps) {
  const [scope, setScope] = useState<NoticeScope>(notice?.scope ?? fixedScope ?? 'GLOBAL')
  const [category, setCategory] = useState<NoticeCategory>(notice?.category ?? 'UPDATE')
  const [title, setTitle] = useState(notice?.title ?? '')
  const [content, setContent] = useState(notice?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    const body: NoticeInput = {
      scope: fixedScope ?? scope,
      category,
      title: title.trim(),
      content: content.trim(),
    }
    try {
      if (notice) await api.updateNotice(notice.id, body)
      else await api.createNotice(body)
      onSaved(notice ? '공지를 고쳤어요.' : '공지를 올렸어요.')
    } catch (e) {
      setFormError(errorMessage(e, '공지를 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="notices-form" onSubmit={handleSubmit}>
      <h2 className="notices-page__heading">{notice ? '공지 수정' : '공지 쓰기'}</h2>
      <div className="notices-form__row">
        {!fixedScope && (
          <label className="field">
            <span className="field__label">뜨는 자리</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as NoticeScope)}>
              {NOTICE_SCOPES.map((value) => (
                <option key={value} value={value}>
                  {NOTICE_SCOPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field__label">종류</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as NoticeCategory)}>
            {NOTICE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {NOTICE_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field__label">제목</span>
        <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field__label">내용</span>
        <textarea value={content} rows={6} maxLength={4000} onChange={(e) => setContent(e.target.value)} required />
      </label>
      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}
      <div className="notices-form__actions">
        <button type="submit" className="button button--primary button--sm" disabled={saving}>
          {saving ? '저장 중…' : notice ? '저장' : '올리기'}
        </button>
        <button type="button" className="button button--ghost button--sm" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  )
}
