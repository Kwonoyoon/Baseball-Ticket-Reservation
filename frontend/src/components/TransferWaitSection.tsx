import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { GameSummary, TransferWait } from '../api/types'
import { formatGameDate, formatTime, isBookable, todayInSeoul } from '../lib/format'

type TransferWaitSectionProps = {
  /** 값이 바뀌면 대기 목록을 다시 받는다. (양도를 사서 대기에서 빠졌을 수 있다) */
  refreshKey: number
}

/**
 * 양도 대기. 경기를 골라 대기하면, 그 경기의 양도글이 올라올 때 줄 선 순서대로 먼저 살 수 있다.
 * 우선 구매 시간은 서버가 정하고 알려 주므로, 여기서는 "내 순서"만 보여 준다.
 */
export function TransferWaitSection({ refreshKey }: TransferWaitSectionProps) {
  const [waits, setWaits] = useState<TransferWait[] | null>(null)
  const [date, setDate] = useState(todayInSeoul)
  const [games, setGames] = useState<GameSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyGameId, setBusyGameId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getMyTransferWaits(controller.signal)
      .then(setWaits)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '대기 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [refreshKey, reloadKey])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getSchedule(date, null, controller.signal)
      .then(setGames)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '경기 목록을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [date])

  const waitingGameIds = new Set((waits ?? []).map((wait) => wait.game.id))

  const handleRegister = async (game: GameSummary) => {
    setBusyGameId(game.id)
    setNotice(null)
    setError(null)
    try {
      const wait = await api.registerTransferWait(game.id)
      setNotice(`대기 등록했어요. 현재 ${wait.position}번째예요.`)
      setReloadKey((key) => key + 1)
    } catch (e) {
      setError(errorMessage(e, '대기 등록하지 못했습니다.'))
    } finally {
      setBusyGameId(null)
    }
  }

  const handleCancel = async (wait: TransferWait) => {
    setBusyGameId(wait.game.id)
    setNotice(null)
    setError(null)
    try {
      await api.cancelTransferWait(wait.id)
      setNotice('대기를 취소했어요.')
      setReloadKey((key) => key + 1)
    } catch (e) {
      setError(errorMessage(e, '대기를 취소하지 못했습니다.'))
    } finally {
      setBusyGameId(null)
    }
  }

  return (
    <section className="transfer-wait" aria-labelledby="transfer-wait-title">
      <h2 id="transfer-wait-title" className="transfer-market__heading">
        양도 대기
      </h2>
      <p className="transfer-market__intro">
        경기를 골라 대기하면, 그 경기의 양도글이 올라올 때 줄 선 순서대로 <strong>먼저 살 수 있어요.</strong>
      </p>

      {notice && (
        <p className="notice notice--success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {waits !== null && waits.length > 0 && (
        <ul className="transfer-list" aria-label="내 대기 목록">
          {waits.map((wait) => (
            <li key={wait.id} className="transfer-card">
              <div className="transfer-card__main">
                <h3 className="transfer-card__matchup">
                  {wait.game.awayTeam.name} <span>vs</span> {wait.game.homeTeam.name}
                </h3>
                <p className="transfer-card__info">
                  {formatGameDate(wait.game.startAt)} {formatTime(wait.game.startAt)} · {wait.game.stadium.name}
                </p>
              </div>
              <div className="transfer-card__side">
                <span className="transfer-card__status is-open">내 순서 {wait.position}번째</span>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  disabled={busyGameId === wait.game.id}
                  onClick={() => handleCancel(wait)}
                >
                  대기 취소
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="transfer-wait__picker">
        <label className="transfer-wait__date">
          경기 날짜
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        {games === null ? null : games.length === 0 ? (
          <p className="transfer-wait__empty">이 날짜에는 경기가 없어요.</p>
        ) : (
          <ul className="transfer-wait__games">
            {games.map((game) => (
              <li key={game.id}>
                <span>
                  {game.awayTeam.name} vs {game.homeTeam.name} · {formatTime(game.startAt)}
                </span>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  disabled={waitingGameIds.has(game.id) || !isBookable(game.startAt) || busyGameId === game.id}
                  onClick={() => handleRegister(game)}
                >
                  {waitingGameIds.has(game.id) ? '대기 중' : '대기하기'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
