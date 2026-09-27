/** 헤더 버튼용 아이콘. 외부 아이콘 라이브러리 없이 색은 글자색(currentColor)을 따른다. */

const commonProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function BellIcon() {
  return (
    <svg {...commonProps}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg {...commonProps}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg {...commonProps}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function TicketIcon() {
  return (
    <svg {...commonProps}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 11v2M13 17v2" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
