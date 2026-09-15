import { useEffect, useRef, useState } from 'react'
import { formatCountdown, secondsUntil } from '../lib/format'

type HoldCountdownProps = {
  expiresAt: string
  onExpire: () => void
}

/** 선점 만료 시각이 바뀌면 부모에서 key를 바꿔 새로 마운트한다. */
export function HoldCountdown({ expiresAt, onExpire }: HoldCountdownProps) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt))
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = secondsUntil(expiresAt)
      setSeconds(remaining)
      if (remaining <= 0) {
        window.clearInterval(timer)
        onExpireRef.current()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  return (
    <p className={`countdown${seconds <= 60 ? ' countdown--urgent' : ''}`} role="timer">
      좌석 선점 남은 시간 <strong>{formatCountdown(seconds)}</strong>
    </p>
  )
}
