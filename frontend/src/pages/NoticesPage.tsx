import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Notice } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { NoticeForm } from '../components/NoticeForm'
import { NoticeList } from '../components/NoticeList'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { NOTICE_SCOPE_LABELS } from '../lib/notice'
import './NoticesPage.css'

/** 목록에서 한 번에 받아 오는 공지 수. 서버가 허용하는 최대값이다. */
const PAGE_SIZE = 50

/** 폼에 띄울 대상. 'new'는 새 공지 쓰기, 공지 객체는 그 공지 수정이다. */
type Editing = Notice | 'new'

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
  const [editing, setEditing] = useState<Editing | null>(null)
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

  const handleSaved = (message: string) => {
    setNotice(message)
    setEditing(null)
    reload()
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
          setEditing(target)
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
        {isAdmin && !editing && (
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => {
              setNotice(null)
              setEditing('new')
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

      {isAdmin && editing && (
        <NoticeForm
          key={editing === 'new' ? 'new' : editing.id}
          notice={editing === 'new' ? null : editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
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
