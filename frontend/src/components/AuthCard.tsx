import type { ReactNode } from 'react'

type AuthCardProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card">
      <h1 className="auth-card__title">{title}</h1>
      <p className="auth-card__desc">{description}</p>
      {children}
      {footer && <p className="auth-card__footer">{footer}</p>}
    </section>
  )
}
