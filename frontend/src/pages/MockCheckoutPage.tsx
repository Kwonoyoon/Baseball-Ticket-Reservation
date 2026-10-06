import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { PaymentMethod } from '../api/types'
import { formatPrice, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../lib/format'
import {
  CARD_COMPANIES,
  INSTALLMENT_MIN_AMOUNT,
  INSTALLMENT_MONTHS,
  PAYMENT_FAIL_PATH,
  PAYMENT_SUCCESS_PATH,
  TEST_OUTCOMES,
  TIMEOUT_CODE,
  USER_CANCELED_CODE,
  type MockPgTestOutcome,
} from '../lib/mockPg'
import './MockCheckoutPage.css'

/** 서버가 주는 LocalDateTime(시간대 없음)은 서울 시간이다. */
function parseSeoulTime(value: string): number {
  return Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}+09:00`)
}

/** 돌아갈 주소는 우리 성공·실패 페이지만 허용한다. (쿼리로 다른 사이트를 넣어 보내는 것을 막는다) */
function safeReturnPath(value: string | null, fallback: string): string {
  return value === PAYMENT_SUCCESS_PATH || value === PAYMENT_FAIL_PATH ? value : fallback
}

function readOrder(params: URLSearchParams) {
  const orderId = params.get('orderId')
  const amount = Number(params.get('amount'))
  const method = params.get('method') as PaymentMethod | null
  if (!orderId || !Number.isInteger(amount) || amount <= 0) return null
  return {
    orderId,
    orderName: params.get('orderName') ?? '주문',
    amount,
    method: method && PAYMENT_METHODS.includes(method) ? method : 'CARD',
    deadline: params.get('deadline'),
    successPath: safeReturnPath(params.get('successUrl'), PAYMENT_SUCCESS_PATH),
    failPath: safeReturnPath(params.get('failUrl'), PAYMENT_FAIL_PATH),
  }
}

/** 남은 결제 시간(초). 마감이 없으면 null */
function useRemainingSeconds(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])
  if (!deadline) return null
  return Math.max(0, Math.floor((parseSeoulTime(deadline) - now) / 1000))
}

/**
 * 가짜 PG 결제창. 실제 PG라면 PG 회사 화면이 뜨는 자리다.
 * 사용자가 인증하면 결제 키를 받아 성공 페이지로, 거절·취소·시간 초과면 실패 페이지로 돌려보낸다.
 * 실제 돈은 오가지 않고, 카드 번호 같은 결제 정보도 받지 않는다.
 */
export function MockCheckoutPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const order = readOrder(params)

  const [method, setMethod] = useState<PaymentMethod>(order?.method ?? 'CARD')
  const [cardCompany, setCardCompany] = useState(CARD_COMPANIES[0])
  const [installmentMonths, setInstallmentMonths] = useState(0)
  const [outcome, setOutcome] = useState<MockPgTestOutcome>('APPROVE')
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remaining = useRemainingSeconds(order?.deadline ?? null)

  const orderId = order?.orderId
  const failPath = order?.failPath
  const timedOut = remaining === 0

  // 결제 시간이 지나면 결제창을 닫고 실패 페이지로 보낸다.
  useEffect(() => {
    if (!timedOut || !orderId || !failPath) return
    const query = new URLSearchParams({ code: TIMEOUT_CODE, message: '결제 시간이 지났습니다.', orderId })
    navigate(`${failPath}?${query.toString()}`, { replace: true })
  }, [timedOut, orderId, failPath, navigate])

  if (!order) {
    return (
      <div className="mockpg">
        <section className="mockpg__window" aria-label="결제창">
          <p className="mockpg__error" role="alert">
            결제 정보가 올바르지 않습니다. 예매 화면에서 다시 시도해 주세요.
          </p>
        </section>
      </div>
    )
  }

  const goFail = (code: string, message: string) => {
    const query = new URLSearchParams({ code, message, orderId: order.orderId })
    navigate(`${order.failPath}?${query.toString()}`, { replace: true })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!agreed || paying) return
    setPaying(true)
    setError(null)
    try {
      const result = await api.mockPgCheckout({
        orderId: order.orderId,
        orderName: order.orderName,
        amount: order.amount,
        method,
        cardCompany: method === 'CARD' ? cardCompany : null,
        installmentMonths: method === 'CARD' ? installmentMonths : 0,
        testOutcome: outcome,
      })
      const query = new URLSearchParams({
        paymentKey: result.paymentKey,
        orderId: order.orderId,
        amount: String(order.amount),
      })
      navigate(`${order.successPath}?${query.toString()}`, { replace: true })
    } catch (e) {
      // 카드 거절처럼 PG가 결제를 거절하면 실패 페이지로 보낸다. 통신 오류면 결제창에 남아 다시 시도하게 한다.
      if (e instanceof ApiError && e.status === 400) {
        goFail(e.code, e.message)
        return
      }
      setError(errorMessage(e, '결제 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      setPaying(false)
    }
  }

  const installmentAllowed = method === 'CARD' && order.amount >= INSTALLMENT_MIN_AMOUNT
  const minutes = remaining === null ? null : Math.floor(remaining / 60)
  const seconds = remaining === null ? null : remaining % 60

  return (
    <div className="mockpg">
      <section className="mockpg__window" aria-labelledby="mockpg-title">
        <header className="mockpg__header">
          <h1 id="mockpg-title" className="mockpg__brand">
            SAFE<span>PAY</span>
          </h1>
          <span className="mockpg__badge">테스트 결제</span>
        </header>

        <dl className="mockpg__order">
          <div>
            <dt>상점</dt>
            <dd>SAFETICKET</dd>
          </div>
          <div>
            <dt>주문</dt>
            <dd>{order.orderName}</dd>
          </div>
          <div className="mockpg__amount">
            <dt>결제 금액</dt>
            <dd>{formatPrice(order.amount)}</dd>
          </div>
        </dl>

        {minutes !== null && seconds !== null && (
          <p className={`mockpg__timer${remaining !== null && remaining < 60 ? ' is-urgent' : ''}`} role="timer">
            남은 결제 시간 {minutes}:{String(seconds).padStart(2, '0')}
          </p>
        )}

        <form className="mockpg__form" onSubmit={handleSubmit}>
          <fieldset className="mockpg__methods" disabled={paying}>
            <legend>결제 수단</legend>
            {PAYMENT_METHODS.map((value) => (
              <label key={value} className={`mockpg__method${method === value ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => {
                    setMethod(value)
                    setInstallmentMonths(0)
                  }}
                />
                {PAYMENT_METHOD_LABELS[value]}
              </label>
            ))}
          </fieldset>

          {method === 'CARD' ? (
            <div className="mockpg__card">
              <label className="mockpg__field">
                <span>카드사</span>
                <select value={cardCompany} onChange={(event) => setCardCompany(event.target.value)} disabled={paying}>
                  {CARD_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mockpg__field">
                <span>할부</span>
                <select
                  value={installmentMonths}
                  onChange={(event) => setInstallmentMonths(Number(event.target.value))}
                  disabled={paying || !installmentAllowed}
                >
                  {INSTALLMENT_MONTHS.map((months) => (
                    <option key={months} value={months}>
                      {months === 0 ? '일시불' : `${months}개월`}
                    </option>
                  ))}
                </select>
              </label>
              {!installmentAllowed && <p className="mockpg__hint">할부는 5만 원 이상 결제할 때 고를 수 있어요.</p>}
            </div>
          ) : (
            <p className="mockpg__hint">
              실제로는 {PAYMENT_METHOD_LABELS[method]} 앱에서 결제를 승인합니다. 테스트 결제에서는 아래 [결제하기]로 바로 승인해요.
            </p>
          )}

          <label className="mockpg__field mockpg__test">
            <span>테스트 결과</span>
            <select
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as MockPgTestOutcome)}
              disabled={paying}
            >
              {TEST_OUTCOMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mockpg__agree">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} disabled={paying} />
            주문 내용을 확인했으며 결제 진행에 동의합니다.
          </label>

          {error && (
            <p className="mockpg__error" role="alert">
              {error}
            </p>
          )}

          <div className="mockpg__actions">
            <button
              type="button"
              className="mockpg__cancel"
              disabled={paying}
              onClick={() => goFail(USER_CANCELED_CODE, '결제를 취소했습니다.')}
            >
              취소
            </button>
            <button type="submit" className="mockpg__pay" disabled={!agreed || paying}>
              {paying ? '결제 중…' : `${formatPrice(order.amount)} 결제하기`}
            </button>
          </div>
        </form>

        <p className="mockpg__notice">학습용 가짜 결제창입니다. 실제 돈은 결제되지 않으며 카드 정보도 받지 않습니다.</p>
      </section>
    </div>
  )
}
