import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Notice, NoticeCategory, NoticeInput, NoticeScope } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { NoticeList } from '../components/NoticeList'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABELS, NOTICE_SCOPE_LABELS, NOTICE_SCOPES } from '../lib/notice'
import './NoticesPage.css'

/** 목록에서 한 번에 받아 오는 공지 수. 서버가 허용하는 최대값이다. */
const PAGE_SIZE = 50

type Draft = NoticeInput & { id: number | null }

const emptyDraft = (scope: NoticeScope = 'GLOBAL'): Draft => ({
  id: null,
  scope,
  category: 'UPDATE',
  title: '',
  content: '',
})

/**
 * 전체 공지. 시스템 업데이트·이벤트·점검 안내를 모아 보여 준다.
 * 관리자에게는 공지를 쓰고 고치고 지우는 화면과 커뮤니티 공지 목록이 더 보인다. (서버도 관리자만 허용한다)
 */
export function NoticesPage() {
  const { isAdmin } = useAuth()
  const [globalNotices, setGlobalNotices] = useState<Notice[] | null>(null)
  const [communityNotices, setCommunityNotices] = useState<Notice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.getNotices('GLOBAL', PAGE_SIZE, controller.signal),
      // 커뮤니티 공지는 커뮤니티 화면에서 읽으므로, 여기서는 관리자가 관리할 때만 받는다.
      isAdmin ? api.getNotices('COMMUNITY', PAGE_SIZE, controller.signal) : Promise.resolve([] as Notice[]),
    ])
      .then(([globalList, communityList]) => {
        setGlobalNotices(globalList)
        setCommunityNotices(communityList)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '공지를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [isAdmin, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    setSaving(true)
    setFormError(null)
    const body: NoticeInput = {
      scope: draft.scope,
      category: draft.category,
      title: draft.title.trim(),
      content: draft.content.trim(),
    }
    try {
      if (draft.id === null) await api.createNotice(body)
      else await api.updateNotice(draft.id, body)
      setNotice(draft.id === null ? '공지를 올렸어요.' : '공지를 고쳤어요.')
      setDraft(null)
      reload()
    } catch (e) {
      setFormError(errorMessage(e, '공지를 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (target: Notice) => {
    if (!window.confirm(`"${target.title}" 공지를 지울까요?`)) return
    setNotice(null)
    try {
      await api.deleteNotice(target.id)
      setNotice('공지를 지웠어요.')
      reload()
    } catch (e) {
      setError(errorMessage(e, '공지를 지우지 못했습니다.'))
    }
  }

  const adminActions = (target: Notice) => (
    <>
      <button
        type="button"
        className="button button--ghost button--sm"
        onClick={() => {
          setNotice(null)
          setDraft({ ...target })
        }}
      >
        수정
      </button>
      <button type="button" className="button button--danger button--sm" onClick={() => handleDelete(target)}>
        삭제
      </button>
    </>
  )

  return (
    <div className="notices-page">
      <div className="notices-page__head">
        <h1 className="page-title">공지</h1>
        {isAdmin && !draft && (
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => {
              setNotice(null)
              setDraft(emptyDraft())
            }}
          >
            공지 쓰기
          </button>
        )}
      </div>
      <p className="notices-page__intro">시스템 업데이트, 이벤트, 점검 소식을 알려 드려요.</p>

      {notice && (
        <p className="notice notice--success" role="status">
          {notice}
        </p>
      )}

      {isAdmin && draft && (
        <form className="notices-form" onSubmit={handleSubmit}>
          <h2 className="notices-page__heading">{draft.id === null ? '공지 쓰기' : '공지 수정'}</h2>
          <div className="notices-form__row">
            <label className="field">
              <span className="field__label">뜨는 자리</span>
              <select
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value as NoticeScope })}
              >
                {NOTICE_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {NOTICE_SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">종류</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as NoticeCategory })}
              >
                {NOTICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {NOTICE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field__label">제목</span>
            <input
              value={draft.title}
              maxLength={100}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">내용</span>
            <textarea
              value={draft.content}
              rows={6}
              maxLength={4000}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              required
            />
          </label>
          {formError && (
            <p className="form__error" role="alert">
              {formError}
            </p>
          )}
          <div className="notices-form__actions">
            <button type="submit" className="button button--primary button--sm" disabled={saving}>
              {saving ? '저장 중…' : draft.id === null ? '올리기' : '저장'}
            </button>
            <button type="button" className="button button--ghost button--sm" onClick={() => setDraft(null)}>
              취소
            </button>
          </div>
        </form>
      )}

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            reload()
          }}
        />
      ) : globalNotices === null ? (
        <Loading label="공지를 불러오는 중…" />
      ) : (
        <>
          <section aria-labelledby="notices-global-title">
            {isAdmin && (
              <h2 id="notices-global-title" className="notices-page__heading">
                {NOTICE_SCOPE_LABELS.GLOBAL}
              </h2>
            )}
            {globalNotices.length === 0 ? (
              <EmptyState title="올라온 공지가 없어요." />
            ) : (
              <NoticeList notices={globalNotices} renderActions={isAdmin ? adminActions : undefined} />
            )}
          </section>

          {isAdmin && (
            <section aria-labelledby="notices-community-title">
              <h2 id="notices-community-title" className="notices-page__heading">
                {NOTICE_SCOPE_LABELS.COMMUNITY} <small>(커뮤니티 게시판 맨 위에 뜹니다)</small>
              </h2>
              {communityNotices.length === 0 ? (
                <EmptyState title="올라온 커뮤니티 공지가 없어요." />
              ) : (
                <NoticeList notices={communityNotices} renderActions={adminActions} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
