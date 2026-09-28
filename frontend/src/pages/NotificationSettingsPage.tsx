import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { NotificationPreference } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'

export function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingType, setPendingType] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getNotificationPreferences(controller.signal)
      .then(setPreferences)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '알림 설정을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [reloadKey])

  const handleToggle = async (preference: NotificationPreference) => {
    const nextEnabled = !preference.enabled
    setPendingType(preference.type)
    setPreferences((current) =>
      current?.map((p) => (p.type === preference.type ? { ...p, enabled: nextEnabled } : p)) ?? null,
    )
    try {
      await api.updateNotificationPreference(preference.type, nextEnabled)
    } catch {
      // 실패하면 원래 상태로 되돌린다.
      setPreferences((current) =>
        current?.map((p) => (p.type === preference.type ? { ...p, enabled: preference.enabled } : p)) ?? null,
      )
    } finally {
      setPendingType(null)
    }
  }

  return (
    <div className="notification-settings">
      <h1 className="page-title">알림 설정</h1>
      <p className="page-desc">받고 싶지 않은 알림은 꺼두세요. 여기서 끈 알림은 알림 센터에도 쌓이지 않습니다.</p>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : preferences === null ? (
        <Loading label="알림 설정을 불러오는 중…" />
      ) : (
        <ul className="preference-list">
          {preferences.map((preference) => (
            <li key={preference.type} className="preference-item">
              <span className="preference-item__label">{preference.label}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preference.enabled}
                  disabled={pendingType === preference.type}
                  onChange={() => handleToggle(preference)}
                  aria-label={`${preference.label} 수신 ${preference.enabled ? '끄기' : '켜기'}`}
                />
                <span className="switch__track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
