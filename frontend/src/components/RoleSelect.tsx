import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MemberRole } from '../api/types'
import { USER_TYPE_LABELS } from '../auth/roles'

const ROLES: MemberRole[] = ['MEMBER', 'ADMIN']

type RoleSelectProps = {
  value: MemberRole
  disabled?: boolean
  /** 화면 낭독기용 이름. 예: "fan02 권한" */
  label: string
  onChange: (role: MemberRole) => void
}

/**
 * 권한 선택 드롭다운.
 * 브라우저 기본 select는 펼쳐진 목록을 꾸밀 수 없어 직접 그린다.
 */
export function RoleSelect({ value, disabled = false, label, onChange }: RoleSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const choose = (role: MemberRole) => {
    setOpen(false)
    if (role !== value) onChange(role)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const next = ROLES[(ROLES.indexOf(value) + (event.key === 'ArrowDown' ? 1 : ROLES.length - 1)) % ROLES.length]
      choose(next)
    }
  }

  return (
    <div className={`role-select${open ? ' is-open' : ''}`} ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="role-select__toggle"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{USER_TYPE_LABELS[value]}</span>
        <span className="role-select__arrow" aria-hidden="true" />
      </button>

      {open && (
        <ul className="role-select__list" role="listbox" aria-label={label}>
          {ROLES.map((role) => (
            <li key={role}>
              <button
                type="button"
                className={`role-select__option${role === value ? ' is-current' : ''}`}
                role="option"
                aria-selected={role === value}
                onClick={() => choose(role)}
              >
                {USER_TYPE_LABELS[role]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
