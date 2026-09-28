import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import { USER_TYPE_LABELS } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { AttendancePanel } from '../components/AttendancePanel'
import { FavoriteTeamPanel } from '../components/FavoriteTeamPanel'
import { parseSeoulDateTime } from '../lib/format'

/**
 * 마이페이지: 내 정보와 메뉴. RequireAuth 안에서만 렌더링된다.
 * 예매 확인/취소, 비밀번호 변경, 회원 탈퇴는 이 화면에서 바로 입력하지 않고 각자의 화면으로 들어가서 한다.
 */
export function AccountPage() {
  const { member, userType } = useAuth()

  if (!member) return null

  return (
    <div className="account">
      <h1 className="page-title">마이페이지</h1>

      <section className="panel" aria-labelledby="account-info-title">
        <div className="panel__header">
          <h2 id="account-info-title" className="panel__title">
            내 정보
          </h2>
          <span className={`badge badge--role-${userType.toLowerCase()}`}>{USER_TYPE_LABELS[userType]}</span>
        </div>
        <dl className="info-list">
          <dt>아이디</dt>
          <dd>{member.username}</dd>
          <dt>이름</dt>
          <dd>{member.name}</dd>
          <dt>이메일</dt>
          <dd>{member.email}</dd>
        </dl>
      </section>

      <section className="panel" aria-labelledby="account-activity-title">
        <h2 id="account-activity-title" className="panel__title">
          내 활동
        </h2>
        <ul className="account-menu">
          <li>
            <Link to="/my/reservations" className="account-menu__item">
              <span className="account-menu__text">
                <strong>예매 확인 / 취소</strong>
                <small>예매한 티켓을 확인하고, 경기 전이면 취소할 수 있어요</small>
              </span>
              <UpcomingCount />
            </Link>
          </li>
        </ul>
      </section>

      <div className="mypage__grid">
        <FavoriteTeamPanel />
        <AttendancePanel />
      </div>

      <section className="panel" aria-labelledby="account-manage-title">
        <h2 id="account-manage-title" className="panel__title">
          계정 관리
        </h2>
        <ul className="account-menu">
          <li>
            <Link to="/my/account/password" className="account-menu__item">
              <span className="account-menu__text">
                <strong>비밀번호 변경</strong>
                <small>현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요</small>
              </span>
            </Link>
          </li>
          {member.role !== 'ADMIN' && (
            <li>
              <Link to="/my/account/withdraw" className="account-menu__item account-menu__item--danger">
                <span className="account-menu__text">
                  <strong>회원 탈퇴</strong>
                  <small>탈퇴하면 이름과 이메일이 삭제돼요</small>
                </span>
              </Link>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

/** 아직 시작하지 않은 확정 예매 수. 불러오지 못하면 아무것도 보여 주지 않는다. (메뉴 자체는 계속 쓸 수 있다) */
function UpcomingCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyReservations(controller.signal)
      .then((reservations) => {
        const now = Date.now()
        setCount(
          reservations.filter(
            (reservation) =>
              reservation.status === 'CONFIRMED' && parseSeoulDateTime(reservation.game.startAt).getTime() > now,
          ).length,
        )
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setCount(null)
      })
    return () => controller.abort()
  }, [])

  if (!count) return null
  return <span className="badge badge--confirmed">관람 예정 {count}건</span>
}
