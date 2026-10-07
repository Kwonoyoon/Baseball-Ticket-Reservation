import { useEffect, useState } from 'react'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Notice } from '../api/types'
import { NoticeList } from './NoticeList'

/** 커뮤니티 맨 위에 보여 줄 공지 개수. 더 많은 공지는 헤더의 공지 메뉴에서 본다. */
const COMMUNITY_NOTICE_COUNT = 3

/**
 * 커뮤니티 공지. 시스템 업데이트·이벤트·점검 안내만 오며, 구단 게시판과 무관하게 모든 구단에서 똑같이 보인다.
 * 공지는 보조 정보라서, 없거나 불러오지 못하면 자리를 비우고 게시판은 그대로 쓰게 한다.
 */
export function CommunityNotices() {
  const [notices, setNotices] = useState<Notice[]>([])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getNotices('COMMUNITY', COMMUNITY_NOTICE_COUNT, controller.signal)
      .then(setNotices)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setNotices([])
      })
    return () => controller.abort()
  }, [])

  if (notices.length === 0) return null

  return (
    <section className="community-notices" aria-label="커뮤니티 공지">
      <h2 className="community-section-title">공지</h2>
      <NoticeList notices={notices} />
    </section>
  )
}
