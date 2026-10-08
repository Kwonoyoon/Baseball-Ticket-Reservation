import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostDetail, Report } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'
import { postCategoryLabel } from '../lib/postCategory'

const TARGET_LABEL = { POST: '게시글', COMMENT: '댓글' } as const

/** 원래 글을 새 탭으로 연다. (신고 목록은 그대로 둔다) */
function OriginalPostLink({ report }: { report: Report }) {
  if (report.postId === null || report.postTeamId === null) return null
  return (
    <Link
      to={`/community/${report.postTeamId}/posts/${report.postId}`}
      target="_blank"
      rel="noreferrer"
      className="admin-report__open"
    >
      원래 글 열기 ↗
    </Link>
  )
}

/** 신고된 게시글을 가져와 보여 준다. 관리자 조회라 조회수는 오르지 않는다. */
function ReportedPost({ report }: { report: Report }) {
  const [post, setPost] = useState<PostDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (report.postId === null) return undefined
    const controller = new AbortController()
    api
      .getPostAsAdmin(report.postId, controller.signal)
      .then(setPost)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '게시글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [report.postId])

  if (error) return <p className="admin-report__load-error">{error}</p>
  if (!post) return <Loading label="게시글을 불러오는 중…" />
  return (
    <article className="admin-report__target" aria-label="신고된 게시글">
      <p className="admin-report__target-meta">
        <span className="post-card__badge">{postCategoryLabel(post.category)}</span>
        <span>{post.authorName}</span>
        <span>{formatDateTime(post.createdAt)}</span>
      </p>
      <h3 className="admin-report__target-title">{post.title}</h3>
      <p className="admin-report__target-text">{post.content}</p>
      <OriginalPostLink report={report} />
    </article>
  )
}

/** 신고된 댓글을 보여 준다. 신고 처리로 지운 뒤에도 관리자는 원래 내용을 볼 수 있다. */
function ReportedComment({ report }: { report: Report }) {
  return (
    <article className="admin-report__target" aria-label="신고된 댓글">
      <p className="admin-report__target-context">「{report.postTitle}」 글에 단 댓글</p>
      <p className="admin-report__target-meta">
        <span>{report.targetAuthorName}</span>
      </p>
      <p className="admin-report__target-text">{report.targetContent}</p>
      {report.targetStatus === 'DELETED_BY_REPORT' && (
        <p className="admin-report__target-note">게시글 화면에는 "신고 처리로 삭제된 댓글입니다."로 보입니다.</p>
      )}
      <OriginalPostLink report={report} />
    </article>
  )
}

type ReportItemProps = {
  report: Report
  busy: boolean
  onDelete: (report: Report) => void
}

/** 신고 한 건: 신고 시간·신고자·신고 사유, [내용 보기]로 펼치는 신고 대상, [삭제] */
function ReportItem({ report, busy, onDelete }: ReportItemProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const label = TARGET_LABEL[report.targetType]
  const deleted = report.targetStatus === 'DELETED'

  return (
    <li className="panel admin-report">
      <div className="admin-report__head">
        <span className={`badge badge--status-${report.targetType === 'POST' ? 'confirmed' : 'pending'}`}>{label}</span>
        {report.targetStatus === 'DELETED_BY_REPORT' && <span className="admin-report__state">신고 처리됨</span>}
        {deleted && <span className="admin-report__state">삭제됨</span>}
      </div>

      <dl className="admin-report__info">
        <div>
          <dt>신고 시간</dt>
          <dd>{formatDateTime(report.createdAt)}</dd>
        </div>
        <div>
          <dt>신고자</dt>
          <dd>{report.reporterName}</dd>
        </div>
        <div>
          <dt>신고 사유</dt>
          <dd>{report.reason}</dd>
        </div>
      </dl>

      {deleted ? (
        <p className="admin-report__gone">이미 삭제된 {label}입니다.</p>
      ) : (
        <div className="admin-report__actions">
          <button
            type="button"
            className="button button--ghost button--sm"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '내용 닫기 ▴' : '내용 보기 ▾'}
          </button>
          {report.targetStatus === 'ACTIVE' && (
            <button
              type="button"
              className="button button--danger button--sm"
              disabled={busy}
              onClick={() => onDelete(report)}
            >
              {busy ? '삭제하는 중…' : '삭제'}
            </button>
          )}
        </div>
      )}

      {open && !deleted && (
        <div id={contentId} className="admin-report__content">
          {report.targetType === 'POST' ? <ReportedPost report={report} /> : <ReportedComment report={report} />}
        </div>
      )}
    </li>
  )
}

/**
 * 관리자: 커뮤니티 신고 관리. 신고마다 신고 시간·신고자·신고 사유를 보여 주고,
 * [내용 보기]로 신고된 게시글(서버에서 가져옴)이나 댓글을 아래에 펼쳐 본다.
 * [삭제]는 게시글이면 글을 지우고, 댓글이면 "신고 처리로 삭제된 댓글입니다."로 바꾼다.
 */
export function AdminCommunityReportsPage() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getCommunityReports(controller.signal)
      .then(setReports)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '신고 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  const deleteTarget = async (report: Report) => {
    const question =
      report.targetType === 'POST'
        ? '신고된 게시글을 삭제할까요?\n댓글까지 함께 지워지며 되돌릴 수 없습니다.'
        : '신고된 댓글을 삭제할까요?\n게시글 화면에는 "신고 처리로 삭제된 댓글입니다."로 보입니다.'
    if (!window.confirm(question)) return

    setBusyId(report.id)
    try {
      await api.deleteReportTarget(report.id)
      setNotice(report.targetType === 'POST' ? '게시글을 삭제했습니다.' : '댓글을 신고 처리로 삭제했습니다.')
      setReloadKey((key) => key + 1)
    } catch (e) {
      setNotice(errorMessage(e, '삭제하지 못했습니다.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-community-reports">
      <h1 className="page-title">커뮤니티 신고</h1>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : reports === null ? (
        <Loading />
      ) : reports.length === 0 ? (
        <EmptyState title="접수된 신고가 없습니다." />
      ) : (
        <ul className="admin-report-list">
          {reports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              busy={busyId === report.id}
              onDelete={(target) => void deleteTarget(target)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
