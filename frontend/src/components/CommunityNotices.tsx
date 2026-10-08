import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Notice } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { NoticeForm } from './NoticeForm'
import { NoticeList } from './NoticeList'

/** 커뮤니티 맨 위에 보여 줄 공지 개수. 더 많은 공지는 헤더의 공지 메뉴에서 본다. */
const COMMUNITY_NOTICE_COUNT = 3

/** 폼에 띄울 대상. 'new'는 새 공지 쓰기, 공지 객체는 그 공지 수정이다. */
type Editing = Notice | 'new'

/**
 * 커뮤니티 공지. 시스템 업데이트·이벤트·점검 안내만 오며, 구단 게시판과 무관하게 모든 구단에서 똑같이 보인다.
 * 공지는 보조 정보라서, 없거나 불러오지 못하면 자리를 비우고 게시판은 그대로 쓰게 한다.
 *
 * 관리자에게는 이 자리에서 바로 공지를 올리고(커뮤니티 공지로 고정), 고치고, 내릴 수 있는 버튼이 더 보인다.
 * 공지가 하나도 없어도 관리자에게는 첫 공지를 올릴 자리가 필요해서 영역을 숨기지 않는다. (서버도 관리자만 허용한다)
 */
export function CommunityNotices() {
  const { isAdmin } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getNotices('COMMUNITY', COMMUNITY_NOTICE_COUNT, controller.signal)
      .then(setNotices)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setNotices([])
      })
    return () => controller.abort()
  }, [reloadKey])

  const handleSaved = (saved: string) => {
    setMessage(saved)
    setEditing(null)
    setReloadKey((key) => key + 1)
  }

  const takeDown = async (target: Notice) => {
    if (!window.confirm(`"${target.title}" 공지를 내릴까요?\n내린 공지는 되돌릴 수 없어요.`)) return
    setMessage(null)
    setError(null)
    try {
      await api.deleteNotice(target.id)
      setMessage('공지를 내렸어요.')
      setReloadKey((key) => key + 1)
    } catch (e) {
      setError(errorMessage(e, '공지를 내리지 못했습니다.'))
    }
  }

  if (notices.length === 0 && !isAdmin) return null

  const adminActions = (target: Notice) => (
    <>
      <button
        type="button"
        className="button button--ghost button--sm"
        onClick={() => {
          setMessage(null)
          setEditing(target)
        }}
      >
        수정
      </button>
      <button type="button" className="button button--danger button--sm" onClick={() => void takeDown(target)}>
        내리기
      </button>
    </>
  )

  return (
    <section className="community-notices" aria-label="커뮤니티 공지">
      <div className="community-notices__head">
        <h2 className="community-section-title">공지</h2>
        {isAdmin && !editing && (
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={() => {
              setMessage(null)
              setEditing('new')
            }}
          >
            공지 올리기
          </button>
        )}
      </div>

      {message && (
        <p className="notice notice--success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}

      {isAdmin && editing && (
        <NoticeForm
          key={editing === 'new' ? 'new' : editing.id}
          notice={editing === 'new' ? null : editing}
          fixedScope="COMMUNITY"
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {notices.length > 0 ? (
        <NoticeList notices={notices} renderActions={isAdmin ? adminActions : undefined} />
      ) : (
        <p className="community-notices__empty">올라온 공지가 없어요. 위의 버튼으로 첫 공지를 올려 보세요.</p>
      )}
    </section>
  )
}
