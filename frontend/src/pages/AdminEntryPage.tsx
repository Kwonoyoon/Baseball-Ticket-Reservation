import { useCallback, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import type { EntryVerification, EntryVerifyResult } from '../api/types'
import { QrCameraScanner } from '../components/QrCameraScanner'
import { formatGameDate, formatTime } from '../lib/format'
import './AdminEntryPage.css'

/** 최근 확인 목록에 남기는 건수 */
const HISTORY_SIZE = 10

/** 최근 확인 목록에 쓰는 짧은 결과 이름. 자세한 안내는 서버가 준 message를 쓴다. */
const RESULT_LABELS: Record<EntryVerifyResult, string> = {
  ADMITTED: '입장',
  INVALID_TOKEN: '잘못된 QR',
  EXPIRED_TOKEN: '시간 지난 QR',
  NOT_CONFIRMED: '확정 안 된 예매',
  GAME_CANCELED: '취소된 경기',
  NOT_YET_OPEN: '입장 시간 전',
  GAME_OVER: '끝난 경기',
  ALREADY_ENTERED: '이미 입장',
  OWNER_CHANGED: '양도 전 QR',
  LISTED_FOR_TRANSFER: '양도 중',
}

const checkedClock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

type Outcome =
  | { kind: 'checking' }
  | { kind: 'done'; verification: EntryVerification }
  | { kind: 'error'; message: string }

type Check = { id: number; checkedAt: number; outcome: Outcome }

type FinishedCheck = Check & { outcome: Exclude<Outcome, { kind: 'checking' }> }

function ResultPanel({ check }: { check: Check | null }) {
  if (!check) {
    return (
      <section className="entry-result is-idle" aria-label="확인 결과">
        <p className="entry-result__verdict">대기 중</p>
        <p className="entry-result__message">관람객의 내 티켓 QR을 카메라에 비추거나 QR 값을 붙여 넣어 주세요.</p>
      </section>
    )
  }
  const { outcome } = check
  if (outcome.kind === 'checking') {
    return (
      <section className="entry-result is-checking" aria-label="확인 결과" aria-busy="true">
        <p className="entry-result__verdict">확인 중…</p>
      </section>
    )
  }
  if (outcome.kind === 'error') {
    return (
      <section className="entry-result is-error" aria-label="확인 결과" aria-live="assertive">
        <p className="entry-result__verdict">확인 실패</p>
        <p className="entry-result__message">{outcome.message}</p>
        <p className="entry-result__time">{checkedClock.format(check.checkedAt)}</p>
      </section>
    )
  }

  const { admitted, result, message, reservation, entryOpensAt, enteredAt } = outcome.verification
  return (
    // key로 새 결과마다 다시 그려, 같은 결과가 연달아 나와도 깜빡임으로 새 확인임을 알 수 있게 한다.
    <section
      key={check.id}
      className={`entry-result ${admitted ? 'is-admitted' : 'is-rejected'}`}
      aria-label="확인 결과"
      aria-live="polite"
    >
      <p className="entry-result__verdict">{admitted ? '입장 확인' : '입장 불가'}</p>
      <p className="entry-result__message">{message}</p>
      {result === 'NOT_YET_OPEN' && entryOpensAt && (
        <p className="entry-result__message">
          {formatGameDate(entryOpensAt)} {formatTime(entryOpensAt)}부터 입장할 수 있습니다.
        </p>
      )}
      {result === 'ALREADY_ENTERED' && enteredAt && (
        <p className="entry-result__message">{formatTime(enteredAt)}에 입장했습니다.</p>
      )}
      {reservation && (
        <dl className="entry-result__details">
          <div>
            <dt>예매번호</dt>
            <dd>{reservation.reservationNumber}</dd>
          </div>
          <div>
            <dt>경기</dt>
            <dd>
              {reservation.game.awayTeam.name} vs {reservation.game.homeTeam.name} ·{' '}
              {formatGameDate(reservation.game.startAt)} {formatTime(reservation.game.startAt)}
            </dd>
          </div>
          <div>
            <dt>좌석 {reservation.seats.length}매</dt>
            <dd>
              <ul className="entry-result__seats">
                {reservation.seats.map((seat) => (
                  <li key={`${seat.sectionId}-${seat.rowNo}-${seat.seatNo}`}>
                    {seat.sectionName} {seat.rowNo}열 {seat.seatNo}번
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      )}
      <p className="entry-result__time">{checkedClock.format(check.checkedAt)}</p>
    </section>
  )
}

/**
 * 입장 게이트(관리자) 화면. 관람객의 내 티켓 QR을 카메라로 읽어 서버에 검증하고, 입장 가능 여부를 크게 보여 준다.
 * 입장 확인되면 서버가 바로 입장 처리하므로, 같은 예매는 새 QR로도 다시 들어올 수 없다.
 * 카메라는 계속 켜 두고 다음 사람의 QR을 바로 읽는다. 카메라를 쓸 수 없으면 QR 값을 붙여 넣는다.
 * (QR 값은 서버가 서명하고 30초마다 바뀌어서, 캡처하거나 고쳐 만든 QR은 서버가 거부한다)
 */
export function AdminEntryPage() {
  const [cameraOn, setCameraOn] = useState(true)
  const [manualToken, setManualToken] = useState('')
  const [current, setCurrent] = useState<Check | null>(null)
  const [history, setHistory] = useState<FinishedCheck[]>([])
  const nextId = useRef(1)
  const busy = useRef(false)
  // 카메라는 같은 QR을 1초에도 몇 번씩 읽는다. 방금 확인한 값은 다시 보내지 않는다. (QR은 30초마다 바뀐다)
  const lastToken = useRef<string | null>(null)

  const verify = useCallback(async (token: string) => {
    busy.current = true
    lastToken.current = token
    const id = nextId.current++
    setCurrent({ id, checkedAt: Date.now(), outcome: { kind: 'checking' } })
    let finished: FinishedCheck
    try {
      const verification = await api.verifyEntry(token)
      finished = { id, checkedAt: Date.now(), outcome: { kind: 'done', verification } }
      // 휴대폰이면 짧게(입장) 또는 두 번(거부) 떨어 화면을 보지 않아도 알 수 있게 한다.
      navigator.vibrate?.(verification.admitted ? 120 : [120, 80, 120])
    } catch (e) {
      // 서버에 닿지 못했으면 같은 QR을 다시 비췄을 때 다시 확인한다.
      lastToken.current = null
      finished = {
        id,
        checkedAt: Date.now(),
        outcome: { kind: 'error', message: errorMessage(e, '확인하지 못했습니다. 다시 비춰 주세요.') },
      }
    } finally {
      busy.current = false
    }
    setCurrent(finished)
    setHistory((items) => [finished, ...items].slice(0, HISTORY_SIZE))
  }, [])

  const handleScan = useCallback(
    (value: string) => {
      const token = value.trim()
      if (!token || busy.current || token === lastToken.current) return
      void verify(token)
    },
    [verify],
  )

  /** 직접 넣은 값은 방금 확인한 값이어도 다시 확인한다. (손에 든 스캐너도 값을 입력하고 Enter를 누른다) */
  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = manualToken.trim()
    if (!token || busy.current) return
    setManualToken('')
    void verify(token)
  }

  const checking = current?.outcome.kind === 'checking'

  return (
    <div className="admin-entry">
      <h1 className="page-title">입장 확인</h1>
      <p className="page-desc">
        관람객의 내 티켓 QR을 카메라에 비추면 바로 입장 가능 여부를 보여 줍니다. QR은 30초마다 바뀌므로 캡처한 QR은
        거부됩니다.
      </p>

      <div className="admin-entry__layout">
        <div className="admin-entry__scanner">
          {/* 휴대폰에서는 켜기·끄기 버튼을 카메라 화면 왼쪽 위에 얹고, 직접 넣는 칸을 카메라 위로 올린다. (AdminEntryPage.css) */}
          <div className="admin-entry__camera">
            {cameraOn ? (
              <QrCameraScanner onScan={handleScan} />
            ) : (
              <p className="entry-camera entry-camera--off">카메라가 꺼져 있습니다.</p>
            )}
            <button
              type="button"
              className="button button--ghost button--sm admin-entry__camera-toggle"
              onClick={() => setCameraOn((on) => !on)}
            >
              {cameraOn ? '카메라 끄기' : '카메라 켜기'}
            </button>
          </div>

          <form className="admin-entry__manual" onSubmit={handleManualSubmit}>
            <label className="field">
              <span className="field__label">QR 값 직접 넣기</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="QR을 읽은 값을 붙여 넣으세요"
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
              />
            </label>
            <button type="submit" className="button button--primary" disabled={checking || !manualToken.trim()}>
              확인
            </button>
          </form>
        </div>

        <div className="admin-entry__results">
          <ResultPanel check={current} />

          {history.length > 0 && (
            <section className="admin-entry__history" aria-label="최근 확인">
              <h2>최근 확인</h2>
              <ol>
                {history.map((check) => {
                  const verification = check.outcome.kind === 'done' ? check.outcome.verification : null
                  return (
                    <li
                      key={check.id}
                      className={verification?.admitted ? 'is-admitted' : 'is-rejected'}
                    >
                      <time>{checkedClock.format(check.checkedAt)}</time>
                      <strong>{verification ? RESULT_LABELS[verification.result] : '확인 실패'}</strong>
                      <span>{verification?.reservation?.reservationNumber ?? '-'}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
