import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PaymentMethod, Transfer, TransferStatus } from '../api/types'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { TransferWaitSection } from '../components/TransferWaitSection'
import {
  formatDateTime,
  formatGameDate,
  formatPrice,
  formatTime,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from '../lib/format'
import './TransferMarketPage.css'

const STATUS_LABELS: Record<TransferStatus, string> = {
  OPEN: '판매 중',
  SOLD: '판매 완료',
  CANCELED: '거둠',
}

type Notice = { type: 'success' | 'error'; message: string }

/**
 * 정가 양도 마켓. 위쪽은 지금 살 수 있는 양도글, 아래쪽은 내가 올린 글.
 * 가격은 판매자가 정하지 않고 원래 결제 금액 그대로라서, 여기에는 가격 입력이 없다.
 */
export function TransferMarketPage() {
  const [open, setOpen] = useState<Transfer[] | null>(null)
  const [mine, setMine] = useState<Transfer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [methods, setMethods] = useState<Record<number, PaymentMethod>>({})

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.getTransfers(controller.signal), api.getMyTransfers(controller.signal)])
      .then(([openList, myList]) => {
        setOpen(openList)
        setMine(myList)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '양도글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const handleBuy = async (transfer: Transfer) => {
    const method = methods[transfer.id] ?? 'CARD'
    const confirmed = window.confirm(
      `${transfer.game.awayTeam.name} vs ${transfer.game.homeTeam.name}\n${transfer.seats.join(', ')}\n\n정가 ${formatPrice(transfer.price)}에 구매할까요?`,
    )
    if (!confirmed) return

    setBusyId(transfer.id)
    setNotice(null)
    try {
      await api.buyTransfer(transfer.id, method)
      setNotice({ type: 'success', message: '양도받았습니다. 예매내역에서 확인할 수 있어요.' })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '구매하지 못했습니다.') })
    } finally {
      setBusyId(null)
      // 이미 팔린 글을 눌렀을 수도 있으니 성공이든 실패든 목록을 다시 받는다.
      reload()
    }
  }

  const handleCancel = async (transfer: Transfer) => {
    setBusyId(transfer.id)
    setNotice(null)
    try {
      await api.cancelTransfer(transfer.id)
      setNotice({ type: 'success', message: '양도글을 거뒀습니다.' })
    } catch (e) {
      setNotice({ type: 'error', message: errorMessage(e, '양도글을 거두지 못했습니다.') })
    } finally {
      setBusyId(null)
      reload()
    }
  }

  return (
    <div className="transfer-market">
      <h1 className="page-title">티켓 양도 마켓</h1>
      <p className="transfer-market__intro">
        <strong>정가</strong>로만 주고받아요 양도할 예매는 <Link to="/my/reservations">예매내역</Link>에서 올릴 수
        있습니다.
      </p>

      {notice && (
        <p className={`notice${notice.type === 'success' ? ' notice--success' : ''}`} role="status">
          {notice.message}
        </p>
      )}

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            reload()
          }}
        />
      ) : open === null || mine === null ? (
        <Loading label="양도글을 불러오는 중…" />
      ) : (
        <>
          <section aria-labelledby="transfer-open-title">
            <h2 id="transfer-open-title" className="transfer-market__heading">
              지금 살 수 있는 티켓
            </h2>
            {open.length === 0 ? (
              <EmptyState title="올라온 양도글이 없어요." description="티켓이 올라오면 이곳에 보여요." />
            ) : (
              <ul className="transfer-list">
                {open.map((transfer) => (
                  <li key={transfer.id} className="transfer-card">
                    <TransferSummary transfer={transfer} />
                    <div className="transfer-card__side">
                      <strong className="transfer-card__price">{formatPrice(transfer.price)}</strong>
                      {transfer.mine ? (
                        <button
                          type="button"
                          className="button button--ghost button--sm"
                          disabled={busyId === transfer.id}
                          onClick={() => handleCancel(transfer)}
                        >
                          내 글 거두기
                        </button>
                      ) : (
                        <>
                          <select
                            className="transfer-card__method"
                            aria-label="결제 수단"
                            value={methods[transfer.id] ?? 'CARD'}
                            onChange={(e) =>
                              setMethods((current) => ({ ...current, [transfer.id]: e.target.value as PaymentMethod }))
                            }
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>
                                {PAYMENT_METHOD_LABELS[method]}
                              </option>
                            ))}
                          </select>
                          {transfer.exclusiveUntil && transfer.exclusiveForMe && (
                            <span className="transfer-card__status is-open">
                              내 우선 구매 시간 · {formatTime(transfer.exclusiveUntil)}까지
                            </span>
                          )}
                          <button
                            type="button"
                            className="button button--primary button--sm"
                            disabled={
                              busyId === transfer.id || (transfer.exclusiveUntil !== null && !transfer.exclusiveForMe)
                            }
                            onClick={() => handleBuy(transfer)}
                          >
                            {busyId === transfer.id
                              ? '처리 중…'
                              : transfer.exclusiveUntil !== null && !transfer.exclusiveForMe
                                ? `대기자 우선 구매 중 · ${formatTime(transfer.exclusiveUntil)}까지`
                                : '구매하기'}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TransferWaitSection refreshKey={reloadKey} />

          <section aria-labelledby="transfer-mine-title">
            <h2 id="transfer-mine-title" className="transfer-market__heading">
              내가 올린 양도글
            </h2>
            {mine.length === 0 ? (
              <EmptyState title="올린 양도글이 없어요." description="예매내역에서 확정된 예매를 양도할 수 있어요." />
            ) : (
              <ul className="transfer-list">
                {mine.map((transfer) => (
                  <li key={transfer.id} className="transfer-card">
                    <TransferSummary transfer={transfer} />
                    <div className="transfer-card__side">
                      <span className={`transfer-card__status is-${transfer.status.toLowerCase()}`}>
                        {STATUS_LABELS[transfer.status]}
                      </span>
                      <span className="transfer-card__date">{formatDateTime(transfer.createdAt)} 등록</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function TransferSummary({ transfer }: { transfer: Transfer }) {
  const { game } = transfer
  return (
    <div className="transfer-card__main">
      <h3 className="transfer-card__matchup">
        {game.awayTeam.name} <span>vs</span> {game.homeTeam.name}
      </h3>
      <p className="transfer-card__info">
        {formatGameDate(game.startAt)} {formatTime(game.startAt)} · {game.stadium.name}
      </p>
      <ul className="transfer-card__seats" aria-label="양도 좌석">
        {transfer.seats.map((seat) => (
          <li key={seat}>{seat}</li>
        ))}
      </ul>
      <p className="transfer-card__seller">판매자 {transfer.sellerName}</p>
    </div>
  )
}
