import type { PaymentMethod } from '../api/types'

/**
 * 가짜 PG 결제창 주소. 실제 PG처럼 주문번호·금액·돌아올 주소를 쿼리로 넘긴다.
 * 결제창 쪽 금액은 누구나 바꿀 수 있으므로, 결제 확정 때 서버가 주문 금액과 다시 비교한다.
 */
export const PAYMENT_SUCCESS_PATH = '/payments/success'
export const PAYMENT_FAIL_PATH = '/payments/fail'

export type CheckoutOrder = {
  orderId: string
  orderName: string
  amount: number
  method: PaymentMethod
  /** 이 시각까지 결제해야 한다 (ISO, 서버 시간) */
  deadline: string | null
}

export function checkoutUrl(order: CheckoutOrder): string {
  const params = new URLSearchParams({
    orderId: order.orderId,
    orderName: order.orderName,
    amount: String(order.amount),
    method: order.method,
    successUrl: PAYMENT_SUCCESS_PATH,
    failUrl: PAYMENT_FAIL_PATH,
  })
  if (order.deadline) params.set('deadline', order.deadline)
  return `/mock-pg/checkout?${params.toString()}`
}

/** 결제창 테스트 모드에서 고르는 결과. 백엔드 MockPgTestOutcome 과 같은 값이다. */
export type MockPgTestOutcome =
  | 'APPROVE'
  | 'REJECT_LIMIT_EXCEEDED'
  | 'REJECT_INSUFFICIENT_BALANCE'
  | 'REJECT_CARD_SUSPENDED'

export const TEST_OUTCOMES: { value: MockPgTestOutcome; label: string }[] = [
  { value: 'APPROVE', label: '승인' },
  { value: 'REJECT_LIMIT_EXCEEDED', label: '카드 한도 초과' },
  { value: 'REJECT_INSUFFICIENT_BALANCE', label: '잔액 부족' },
  { value: 'REJECT_CARD_SUSPENDED', label: '정지된 카드' },
]

export const CARD_COMPANIES = ['신한카드', '삼성카드', '현대카드', 'KB국민카드', '롯데카드', '하나카드', '우리카드', 'BC카드', 'NH농협카드']

/** 할부는 5만 원 이상부터 고를 수 있다. (실제 카드 결제와 같은 기준) */
export const INSTALLMENT_MIN_AMOUNT = 50000
export const INSTALLMENT_MONTHS = [0, 2, 3, 4, 5, 6, 10, 12]

/** 사용자가 결제창을 닫았을 때 실패 페이지로 넘기는 코드 */
export const USER_CANCELED_CODE = 'PAY_PROCESS_CANCELED'
/** 결제 시간이 지나 결제창이 스스로 닫혔을 때 */
export const TIMEOUT_CODE = 'PAY_PROCESS_TIMEOUT'
