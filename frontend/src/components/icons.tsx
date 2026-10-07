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

/** 공지(확성기). 알림 벨과 헷갈리지 않게 다른 모양을 쓴다. */
export function MegaphoneIcon() {
  return (
    <svg {...commonProps}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M18 9a4 4 0 0 1 0 6" />
      <path d="M7 14l1.5 5.5" />
    </svg>
  )
}

/** 분실물센터(돋보기) */
export function SearchIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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

/** 입장 QR 스캔: 네 모서리 틀 안의 QR 무늬 */
export function ScanIcon() {
  return (
    <svg {...commonProps}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 8h3v3H8zM13 13h3v3h-3zM13 8h3M8 16h3" />
    </svg>
  )
}

export function MessageIcon() {
  return (
    <svg {...commonProps}>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
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

export function UserIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg {...commonProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg {...commonProps}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg {...commonProps}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M14 12H3" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg {...commonProps}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  )
}
