import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostDetail, Report, ReportStatus } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'
import { scrollPanelIntoView } from '../lib/panelScroll'
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

const STATUS_LABEL: Record<ReportStatus, string> = { PENDING: '처리전', DELETED: '삭제', REJECTED: '반려' }

/** 현황 탭에서 고르는 보기. 처음에는 처리전 신고만 보여 준다. */
type ReportFilter = ReportStatus | 'ALL'

const FILTER_OPTIONS: { value: ReportFilter; label: string }[] = [
  { value: 'PENDING', label: '처리전' },
  { value: 'DELETED', label: '삭제' },
  { value: 'REJECTED', label: '반려' },
  { value: 'ALL', label: '전체' },
]

type ReportItemProps = {
  report: Report
  busy: boolean
  onDelete: (report: Report) => void
  onReject: (report: Report) => void
}

/** 신고 한 건: 신고 시간·신고자·신고 사유, [내용 보기]로 펼치는 신고 대상, 처리전이면 [삭제]·[반려] */
function ReportItem({ report, busy, onDelete, onReject }: ReportItemProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const label = TARGET_LABEL[report.targetType]
  // 대상이 지워져 더 보여 줄 내용이 없다. (신고 처리로 지운 댓글은 관리자가 원래 내용을 볼 수 있다)
  const gone = report.targetStatus === 'DELETED'
  const pending = report.status === 'PENDING'

  // 내용을 펼치면 그 자리로 화면을 옮기고 초점도 옮긴다. (화면 낭독기·키보드 사용자도 바로 내용부터 읽는다)
  useEffect(() => {
    if (!open) return undefined
    contentRef.current?.focus({ preventScroll: true })
    return scrollPanelIntoView(contentRef.current)
  }, [open])

  return (
    <li className={`panel admin-report is-${report.status.toLowerCase()}`}>
      {/* 맨 윗줄: 종류·처리 상태, 그리고 무엇에 대한 신고인지(글 제목·댓글 첫 줄)를 펼치기 전에도 보여 준다. */}
      <div className="admin-report__head">
        <span className={`admin-report__type is-${report.targetType.toLowerCase()}`}>{label}</span>
        <span className={`admin-report__status is-${report.status.toLowerCase()}`}>{STATUS_LABEL[report.status]}</span>
        {report.targetPreview !== null && (
          <span className="admin-report__subject" title={report.targetPreview}>
            {report.targetPreview}
          </span>
        )}
        {report.processedAt && (
          <span className="admin-report__processed">{formatDateTime(report.processedAt)} 처리</span>
        )}
      </div>

      {/* 신고 시간·신고자는 한 줄에 나란히, 신고 사유는 그 아래 한 줄을 다 쓴다. 항목마다 작은 카드로 묶는다. */}
      <dl className="admin-report__info">
        <div className="admin-report__field">
          <dt>신고 시간</dt>
          <dd>{formatDateTime(report.createdAt)}</dd>
        </div>
        <div className="admin-report__field">
          <dt>신고자</dt>
          <dd>{report.reporterName}</dd>
        </div>
        <div className="admin-report__field admin-report__field--wide">
          <dt>신고 사유</dt>
          <dd>{report.reason}</dd>
        </div>
      </dl>

      {gone && <p className="admin-report__gone">이미 삭제된 {label}입니다.</p>}
      {(!gone || pending) && (
        <div className="admin-report__actions">
          {!gone && (
            <button
              type="button"
              className="button button--ghost button--sm"
              aria-expanded={open}
              aria-controls={contentId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? '내용 닫기 ▴' : '내용 보기 ▾'}
            </button>
          )}
          {pending && !gone && (
            <button
              type="button"
              className="button button--danger button--sm"
              disabled={busy}
              onClick={() => onDelete(report)}
            >
              삭제
            </button>
          )}
          {pending && (
            <button
              type="button"
              className="button button--ghost button--sm admin-report__reject"
              disabled={busy}
              onClick={() => onReject(report)}
            >
              반려
            </button>
          )}
        </div>
      )}

      {open && !gone && (
        <div
          id={contentId}
          ref={contentRef}
          className="admin-report__content"
          tabIndex={-1}
          aria-label={`신고된 ${label} 내용`}
        >
          {report.targetType === 'POST' ? <ReportedPost report={report} /> : <ReportedComment report={report} />}
        </div>
      )}
    </li>
  )
}

/**
 * 관리자: 커뮤니티 신고 관리. 제목 아래 처리 상태별 현황 칸을 눌러 그 상태의 신고를 본다.
 * 처음에는 처리전 신고를 최신순으로 보여 준다.
 * [삭제]는 게시글이면 글을 지우고, 댓글이면 "신고 처리로 삭제된 댓글입니다."로 바꾼다.
 * [반려]는 대상을 그대로 두고 신고만 닫는다. 둘 다 같은 대상에 대한 처리전 신고를 함께 처리한다.
 */
export function AdminCommunityReportsPage() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReportFilter>('PENDING')

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

  const process = async (report: Report, action: 'delete' | 'reject') => {
    const label = TARGET_LABEL[report.targetType]
    const question =
      action === 'reject'
        ? `이 신고를 반려할까요?\n${label}은(는) 그대로 두고, 같은 ${label}에 대한 처리전 신고도 함께 반려됩니다.`
        : report.targetType === 'POST'
          ? '신고된 게시글을 삭제할까요?\n댓글까지 함께 지워지며 되돌릴 수 없습니다.'
          : '신고된 댓글을 삭제할까요?\n게시글 화면에는 "신고 처리로 삭제된 댓글입니다."로 보입니다.'
    if (!window.confirm(question)) return

    setBusyId(report.id)
    try {
      if (action === 'reject') {
        await api.rejectReport(report.id)
        setNotice('신고를 반려했습니다. [반려]에서 볼 수 있어요.')
      } else {
        await api.deleteReportTarget(report.id)
        setNotice(
          `${report.targetType === 'POST' ? '게시글을 삭제했습니다.' : '댓글을 신고 처리로 삭제했습니다.'} [삭제]에서 볼 수 있어요.`,
        )
      }
      setReloadKey((key) => key + 1)
    } catch (e) {
      setNotice(errorMessage(e, action === 'reject' ? '반려하지 못했습니다.' : '삭제하지 못했습니다.'))
    } finally {
      setBusyId(null)
    }
  }

  const counts: Record<ReportFilter, number> = { PENDING: 0, DELETED: 0, REJECTED: 0, ALL: reports?.length ?? 0 }
  for (const report of reports ?? []) counts[report.status] += 1
  // 서버가 최신순으로 준다.
  const visible = (reports ?? []).filter((report) => filter === 'ALL' || report.status === filter)
  const filterLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? ''

  return (
    <div className="admin-community-reports">
      {/* 제목(남색 줄) 아래에 처리 상태별 현황 탭 */}
      <div className="admin-reports__head">
        <h1 className="page-title">커뮤니티 신고</h1>
        {/* 현황이 곧 보기 고르기다. 칸을 누르면 그 상태의 신고만 보여 준다. */}
        {reports && (
          <div className="admin-reports__tabs" role="tablist" aria-label="신고 현황">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                className={`admin-reports__tab is-${option.value.toLowerCase()}${
                  filter === option.value ? ' is-current' : ''
                }`}
                onClick={() => setFilter(option.value)}
              >
                <span>{option.label}</span>
                <strong>{counts[option.value]}</strong>
              </button>
            ))}
          </div>
        )}
      </div>

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
      ) : visible.length === 0 ? (
        <EmptyState title={filter === 'ALL' ? '접수된 신고가 없습니다.' : `${filterLabel} 신고가 없습니다.`} />
      ) : (
        <ul className="admin-report-list">
          {visible.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              busy={busyId === report.id}
              onDelete={(target) => void process(target, 'delete')}
              onReject={(target) => void process(target, 'reject')}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
