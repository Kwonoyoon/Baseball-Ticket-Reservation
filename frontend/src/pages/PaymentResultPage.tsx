import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { Loading } from '../components/StatusView'
import { USER_CANCELED_CODE } from '../lib/mockPg'

/**
 * 결제창에서 결제 인증을 마치고 돌아오는 곳. 서버에 결제 확정을 요청하고, 끝나면 예매 상세로 넘어간다.
 * 확정 요청은 같은 결제로 여러 번 보내도 안전하지만, 화면을 다시 그릴 때 두 번 보내지 않도록 한 번만 보낸다.
 */
export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const paymentKey = params.get('paymentKey')
  const orderId = params.get('orderId')
  const amount = Number(params.get('amount'))
  const valid = Boolean(paymentKey && orderId && Number.isInteger(amount) && amount > 0)

  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    if (!valid || requested.current || !paymentKey || !orderId) return
    requested.current = true
    api
      .confirmPayment({ paymentKey, orderId, amount })
      .then((reservation) =>
        navigate(`/reservations/${reservation.id}`, { replace: true, state: { justBooked: true } }),
      )
      .catch((e: unknown) => setError(errorMessage(e, '결제를 확정하지 못했습니다. 예매내역을 확인해 주세요.')))
  }, [valid, paymentKey, orderId, amount, navigate])

  if (!valid || error) {
    return (
      <section className="panel payment-result" aria-labelledby="payment-result-title">
        <h1 id="payment-result-title" className="page-title">
          결제를 확정하지 못했어요
        </h1>
        <p role="alert">{error ?? '결제 정보가 올바르지 않습니다.'}</p>
        <div className="payment-result__actions">
          <Link to="/my/reservations" className="button button--ghost">
            예매내역 보기
          </Link>
          <Link to="/" className="button button--primary">
            경기 일정으로
          </Link>
        </div>
      </section>
    )
  }

  return <Loading label="결제를 확인하는 중…" />
}

/**
 * 결제창에서 결제가 거절되거나 사용자가 취소했을 때 오는 곳.
 * 결제 대기 예매를 지워 좌석을 풀고, 같은 경기에서 좌석을 다시 고를 수 있게 안내한다.
 */
export function PaymentFailPage() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const message = params.get('message')
  const orderId = params.get('orderId')

  const [gameId, setGameId] = useState<number | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    if (!orderId || requested.current) return
    requested.current = true
    api
      .abandonPayment(orderId)
      .then((result) => setGameId(result.gameId))
      // 이미 정리된 주문이면 할 일이 없다. 경기 일정으로 안내한다.
      .catch(() => undefined)
  }, [orderId])

  const canceledByUser = code === USER_CANCELED_CODE

  return (
    <section className="panel payment-result" aria-labelledby="payment-result-title">
      <h1 id="payment-result-title" className="page-title">
        {canceledByUser ? '결제를 취소했어요' : '결제가 완료되지 않았어요'}
      </h1>
      {!canceledByUser && message && <p role="alert">{message}</p>}
      <p className="payment-result__note">선택했던 좌석은 다시 판매됩니다. 결제된 금액은 없어요.</p>
      <div className="payment-result__actions">
        <Link to={gameId ? `/games/${gameId}` : '/'} className="button button--primary">
          {gameId ? '좌석 다시 고르기' : '경기 일정으로'}
        </Link>
      </div>
    </section>
  )
}
