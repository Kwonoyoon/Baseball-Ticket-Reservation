import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Report } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'

/**
 * 관리자: 신고된 글·댓글 확인과 강제 삭제. 대상이 이미 지워졌으면 미리보기가 비어 있다.
 * [내용 보기]로 글 본문(댓글이면 어느 글에 달린 댓글인지와 전체 내용)을 펼쳐 보고 삭제할지 판단한다.
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
    const label = report.targetType === 'POST' ? '글' : '댓글'
    if (!window.confirm(`신고된 ${label}을(를) 삭제할까요?\n되돌릴 수 없습니다.`)) return

    setBusyId(report.id)
    try {
      if (report.targetType === 'POST') await api.deletePostAsAdmin(report.targetId)
      else await api.deleteCommentAsAdmin(report.targetId)
      setNotice(`신고된 ${label}을(를) 삭제했습니다.`)
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
            <li key={report.id} className="panel admin-report-list__item">
              <div className="admin-report-list__body">
                <p className="admin-report-list__meta">
                  <span className={`badge badge--status-${report.targetType === 'POST' ? 'confirmed' : 'pending'}`}>
                    {report.targetType === 'POST' ? '글' : '댓글'}
                  </span>
                  <span>신고자 {report.reporterName}</span>
                  <span>{formatDateTime(report.createdAt)}</span>
                </p>
                {report.targetPreview === null ? (
                  <p className="admin-report-list__deleted">이미 삭제된 글/댓글입니다.</p>
                ) : (
                  <>
                    <p className="admin-report-list__preview">
                      {report.targetAuthorName} — {report.targetPreview}
                    </p>
                    <details className="admin-report-list__detail">
                      <summary>내용 보기</summary>
                      <div className="admin-report-list__content">
                        {report.targetType === 'POST' ? (
                          <p className="admin-report-list__content-title">{report.postTitle}</p>
                        ) : (
                          <p className="admin-report-list__context">「{report.postTitle}」 글에 단 댓글</p>
                        )}
                        <p className="admin-report-list__text">{report.targetContent}</p>
                        {report.postId !== null && report.postTeamId !== null && (
                          // 목록을 그대로 두고 확인하도록 새 탭으로 연다.
                          <Link
                            to={`/community/${report.postTeamId}/posts/${report.postId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-report-list__open"
                          >
                            원래 글 열기 ↗
                          </Link>
                        )}
                      </div>
                    </details>
                  </>
                )}
                <p className="admin-report-list__reason">신고 사유: {report.reason}</p>
              </div>
              {report.targetPreview !== null && (
                <button
                  type="button"
                  className="button button--danger button--sm"
                  disabled={busyId === report.id}
                  onClick={() => void deleteTarget(report)}
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
