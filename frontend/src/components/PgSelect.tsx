import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type PgSelectOption<T extends string | number> = { value: T; label: string }

type PgSelectProps<T extends string | number> = {
  /** 위에 보이는 이름이자 화면 낭독기용 이름 (예: "카드사") */
  label: string
  value: T
  options: PgSelectOption<T>[]
  disabled?: boolean
  onChange: (value: T) => void
}

/**
 * 가짜 PG 결제창의 드롭다운.
 * 브라우저 기본 select는 펼쳐진 목록을 꾸밀 수 없어(운영체제 모양으로 뜬다) 결제창 디자인에 맞춰 직접 그린다.
 * 키보드: 위·아래로 이동, Enter·Space로 고르기, Esc로 닫기, Tab으로 빠져나가면 닫힌다.
 */
export function PgSelect<T extends string | number>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: PgSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const labelId = `${id}-label`
  const listId = `${id}-list`

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return undefined
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  const openList = () => {
    setActive(currentIndex)
    setOpen(true)
  }

  const choose = (next: T) => {
    setOpen(false)
    toggleRef.current?.focus()
    if (next !== value) onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        toggleRef.current?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(options[active].value)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className={`pg-select${open ? ' is-open' : ''}`} ref={rootRef} onKeyDown={handleKeyDown}>
      <span className="pg-select__label" id={labelId}>
        {label}
      </span>
      <button
        ref={toggleRef}
        type="button"
        className="pg-select__toggle"
        role="combobox"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="pg-select__value">{options[currentIndex]?.label}</span>
        <span className="pg-select__arrow" aria-hidden="true" />
      </button>

      {open && (
        <ul className="pg-select__list" id={listId} role="listbox" aria-labelledby={labelId}>
          {options.map((option, index) => {
            const selected = option.value === value
            return (
              <li
                key={String(option.value)}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                className={`pg-select__option${index === active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                onMouseEnter={() => setActive(index)}
                // 누르는 순간 버튼에서 포커스가 빠져 목록이 닫히지 않게 한다.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
