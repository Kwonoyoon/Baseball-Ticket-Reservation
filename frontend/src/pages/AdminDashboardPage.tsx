import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { AdminDashboard } from '../api/types'
import { AdminTrendChart } from '../components/AdminTrendChart'
import { ErrorMessage, Loading } from '../components/StatusView'
import { formatGameDate, formatPrice, formatRate } from '../lib/format'
import './AdminDashboardPage.css'

/** 예매가 한 석이라도 있으면 진행 막대가 눈에 보이도록 남겨 두는 최소 너비(%) */
const MIN_FILL_PERCENT = 2

/**
 * 관리자 페이지의 첫 화면. 오늘 서비스가 어떤 상태인지와 관리자가 챙길 일을 한눈에 보여 준다.
 * 숫자는 서버가 한 번에 모아 주고(/api/admin/dashboard), 카드를 누르면 해당 관리 화면으로 간다.
 */
export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getAdminDashboard(controller.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '대시보드를 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null)
          setReloadKey((key) => key + 1)
        }}
      />
    )
  }
  if (!data) return <Loading label="대시보드를 불러오는 중…" />

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__head">
        <h1 className="page-title">관리자 대시보드</h1>
        <p className="admin-dashboard__date">{data.date} 기준</p>
      </div>

      <section aria-label="오늘 현황">
        <h2 className="admin-dashboard__heading">오늘</h2>
        <dl className="admin-stats">
          <div className="admin-stat">
            <dt>예매</dt>
            <dd>{data.today.reservations.toLocaleString()}건</dd>
          </div>
          <div className="admin-stat">
            <dt>취소</dt>
            <dd>{data.today.canceled.toLocaleString()}건</dd>
          </div>
          <div className="admin-stat">
            <dt>매출</dt>
            <dd>{formatPrice(data.today.revenue)}</dd>
          </div>
          <div className="admin-stat">
            <dt>신규 가입</dt>
            <dd>{data.today.newMembers.toLocaleString()}명</dd>
          </div>
          <div className="admin-stat">
            <dt>입장 확인</dt>
            <dd>{data.today.entered.toLocaleString()}건</dd>
          </div>
        </dl>
      </section>

      <section aria-label="처리할 일">
        <h2 className="admin-dashboard__heading">챙길 일</h2>
        <div className="admin-todos">
          <Link to="/admin/community/reports" className={`admin-todo${data.pending.reports > 0 ? ' is-alert' : ''}`}>
            <span className="admin-todo__label">커뮤니티 신고</span>
            <strong>{data.pending.reports.toLocaleString()}건</strong>
            <span className="admin-todo__go">신고 관리 ›</span>
          </Link>
          <Link to="/admin/members" className={`admin-todo${data.pending.lockedMembers > 0 ? ' is-alert' : ''}`}>
            <span className="admin-todo__label">잠긴 계정</span>
            <strong>{data.pending.lockedMembers.toLocaleString()}개</strong>
            <span className="admin-todo__go">회원 관리 ›</span>
          </Link>
          <Link to="/admin/members" className="admin-todo">
            <span className="admin-todo__label">전체 회원</span>
            <strong>{data.pending.totalMembers.toLocaleString()}명</strong>
            <span className="admin-todo__go">회원 관리 ›</span>
          </Link>
        </div>
      </section>

      <div className="admin-dashboard__columns">
        <section className="panel" aria-label="최근 7일 예매">
          <h2 className="panel__title">최근 7일 예매</h2>
          <AdminTrendChart days={data.last7Days} />
        </section>

        <section className="panel" aria-label="예매율이 높은 경기">
          <h2 className="panel__title">예매율이 높은 경기</h2>
          {data.topGames.length === 0 ? (
            <p className="admin-dashboard__empty">앞으로 열릴 경기가 없어요.</p>
          ) : (
            <ol className="admin-games">
              {data.topGames.map((game) => (
                <li key={game.gameId} className="admin-games__item">
                  <div className="admin-games__top">
                    <Link to={`/games/${game.gameId}`} className="admin-games__name">
                      {game.awayTeam} vs {game.homeTeam}
                    </Link>
                    <span className="admin-games__rate">{formatRate(game.rate)}</span>
                  </div>
                  <div
                    className="admin-games__track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={game.rate}
                    aria-label={`${game.awayTeam} vs ${game.homeTeam} 예매율`}
                  >
                    <span
                      className="admin-games__fill"
                      style={{ width: `${game.sold > 0 ? Math.max(MIN_FILL_PERCENT, game.rate) : 0}%` }}
                    />
                  </div>
                  <p className="admin-games__meta">
                    <span>{formatGameDate(game.startAt)}</span>
                    <span>
                      <strong>{game.sold.toLocaleString()}석</strong> 예매 / 전체 {game.capacity.toLocaleString()}석
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
