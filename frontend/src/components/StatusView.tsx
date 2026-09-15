import type { ReactNode } from 'react'

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="status-view" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="status-view status-view--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button button--ghost button--sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="status-view">
      <p className="status-view__title">{title}</p>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}
