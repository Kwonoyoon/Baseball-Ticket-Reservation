import { useState, type ReactNode } from 'react'
import type { Notice } from '../api/types'
import { formatDateTime } from '../lib/format'
import { NOTICE_CATEGORY_LABELS } from '../lib/notice'
import './NoticeList.css'

type NoticeListProps = {
  notices: Notice[]
  /** 관리자 화면에서만 넘긴다. 공지마다 수정·삭제 버튼 자리를 만든다. */
  renderActions?: (notice: Notice) => ReactNode
}

/**
 * 공지 목록. 제목을 누르면 내용이 펼쳐진다. (공지는 짧고 한 번 읽고 끝이라 상세 페이지를 따로 두지 않는다)
 * 전체 공지 화면과 커뮤니티 맨 위가 같이 쓴다.
 */
export function NoticeList({ notices, renderActions }: NoticeListProps) {
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <ul className="notice-list">
      {notices.map((notice) => {
        const open = openId === notice.id
        return (
          <li key={notice.id} className="notice-item">
            <button
              type="button"
              className="notice-item__head"
              aria-expanded={open}
              aria-controls={`notice-body-${notice.id}`}
              onClick={() => setOpenId(open ? null : notice.id)}
            >
              <span className={`notice-item__tag is-${notice.category.toLowerCase()}`}>
                {NOTICE_CATEGORY_LABELS[notice.category]}
              </span>
              <span className="notice-item__title">{notice.title}</span>
              <time className="notice-item__date" dateTime={notice.createdAt}>
                {formatDateTime(notice.createdAt).slice(0, 10)}
              </time>
            </button>
            {open && (
              <div id={`notice-body-${notice.id}`} className="notice-item__body">
                <p>{notice.content}</p>
                {renderActions && <div className="notice-item__actions">{renderActions(notice)}</div>}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
