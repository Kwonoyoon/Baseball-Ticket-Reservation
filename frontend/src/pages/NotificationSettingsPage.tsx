import { useEffect, useState } from 'react'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { NotificationPreference } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'

export function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

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
    setPendingKey(preference.type)
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
      setPendingKey(null)
    }
  }

  const handleEmailToggle = async (preference: NotificationPreference) => {
    const nextEmailEnabled = !preference.emailEnabled
    const key = `${preference.type}-email`
    setPendingKey(key)
    setPreferences((current) =>
      current?.map((p) => (p.type === preference.type ? { ...p, emailEnabled: nextEmailEnabled } : p)) ?? null,
    )
    try {
      await api.updateNotificationEmailPreference(preference.type, nextEmailEnabled)
    } catch {
      // 실패하면 원래 상태로 되돌린다.
      setPreferences((current) =>
        current?.map((p) => (p.type === preference.type ? { ...p, emailEnabled: preference.emailEnabled } : p)) ??
        null,
      )
    } finally {
      setPendingKey(null)
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
              <span className="preference-item__text">
                <span className="preference-item__label">{preference.label}</span>
                {preference.description && <span className="preference-item__desc">{preference.description}</span>}
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preference.enabled}
                  disabled={pendingKey === preference.type}
                  onChange={() => handleToggle(preference)}
                  aria-label={`${preference.label} 수신 ${preference.enabled ? '끄기' : '켜기'}`}
                />
                <span className="switch__track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      )}

      {preferences !== null && !error ? (
        <>
          <h2 className="page-title">이메일 알림</h2>
          <p className="page-desc">예매 완료·취소 메일을 켜면 알림이 이메일로도 발송됩니다.</p>
          <ul className="preference-list">
            {preferences.map((preference) => (
              <li key={`${preference.type}-email`} className="preference-item">
                <span className="preference-item__text">
                  <span className="preference-item__label">{preference.label} 메일</span>
                  {preference.description && (
                    <span className="preference-item__desc">{preference.description}</span>
                  )}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preference.emailEnabled}
                    disabled={pendingKey === `${preference.type}-email`}
                    onChange={() => handleEmailToggle(preference)}
                    aria-label={`${preference.label} 이메일 수신 ${preference.emailEnabled ? '끄기' : '켜기'}`}
                  />
                  <span className="switch__track" aria-hidden="true" />
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
