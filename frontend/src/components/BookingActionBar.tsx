import { formatPrice } from '../lib/format'

type BookingActionBarProps = {
  seatCount: number
  totalPrice: number
  isAuthenticated: boolean
  submitting: boolean
  onSubmit: () => void
}

/**
 * 좁은 화면에서는 결제 카드가 좌석표 아래로 밀려 한참 스크롤해야 한다.
 * 좌석을 고르면 화면 아래에 붙는 결제 버튼을 따로 띄운다. (넓은 화면에서는 CSS로 숨긴다)
 */
export function BookingActionBar({
  seatCount,
  totalPrice,
  isAuthenticated,
  submitting,
  onSubmit,
}: BookingActionBarProps) {
  if (seatCount === 0) return null

  return (
    <div className="booking-action-bar" role="region" aria-label="선택한 좌석 결제">
      <div className="booking-action-bar__info">
        <span>{seatCount}석 선택</span>
        <strong>{formatPrice(totalPrice)}</strong>
      </div>
      <button type="button" className="button button--primary" disabled={submitting} onClick={onSubmit}>
        {submitting ? '좌석 확인 중…' : isAuthenticated ? '선택 완료 · 결제하기' : '로그인하고 예매하기'}
      </button>
    </div>
  )
}
