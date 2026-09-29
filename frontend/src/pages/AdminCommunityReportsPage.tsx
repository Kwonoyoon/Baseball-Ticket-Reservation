import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Report } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'

/** 관리자: 신고된 글·댓글 확인과 강제 삭제. 대상이 이미 지워졌으면 미리보기가 비어 있다. */
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
