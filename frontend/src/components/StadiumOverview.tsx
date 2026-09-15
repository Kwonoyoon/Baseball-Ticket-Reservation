import type { SeatSection } from '../api/types'
import { formatPrice } from '../lib/format'

type StadiumOverviewProps = {
  sections: SeatSection[]
  activeSectionId: number | null
  remainingBySection: ReadonlyMap<number, number>
  selectedBySection: ReadonlyMap<number, number>
  onSelect: (sectionId: number) => void
}

/** 홈플레이트에서 외야를 바라본 방향으로 구역을 배치한다. (왼쪽 3루, 오른쪽 1루) */
function gridAreaOf(section: SeatSection): string {
  if (section.grade === 'OUTFIELD') return 'outfield'
  if (section.grade === 'PREMIUM') return 'premium'
  const side = section.name.includes('3루') ? '3b' : '1b'
  return section.grade === 'TABLE' ? `table-${side}` : `infield-${side}`
}

export function StadiumOverview({
  sections,
  activeSectionId,
  remainingBySection,
  selectedBySection,
  onSelect,
}: StadiumOverviewProps) {
  return (
    <div className="stadium" role="group" aria-label="구역 선택">
      <div className="stadium__field" aria-hidden="true">
        <div className="stadium__diamond" />
      </div>
      {sections.map((section) => {
        const remaining = remainingBySection.get(section.id) ?? 0
        const selected = selectedBySection.get(section.id) ?? 0
        return (
          <button
            key={section.id}
            type="button"
            className={`stadium__section grade--${section.grade.toLowerCase()}`}
            style={{ gridArea: gridAreaOf(section) }}
            aria-pressed={section.id === activeSectionId}
            onClick={() => onSelect(section.id)}
          >
            <span className="stadium__section-name">{section.name}</span>
            <span className="stadium__section-meta">
              {formatPrice(section.price)} · {remaining > 0 ? `잔여 ${remaining}석` : '매진'}
            </span>
            {selected > 0 && (
              <span className="stadium__badge" aria-label={`${selected}석 선택됨`}>
                {selected}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
