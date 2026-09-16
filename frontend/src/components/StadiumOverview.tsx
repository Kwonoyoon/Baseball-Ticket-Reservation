import type { SeatSection } from '../api/types'
import { formatPrice } from '../lib/format'

type StadiumOverviewProps = {
  sections: SeatSection[]
  activeSectionId: number | null
  /** 구역별 잔여석. 아직 불러오지 못한 구역은 값이 없다. */
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

function remainingLabel(remaining: number | undefined): string {
  if (remaining === undefined) return '잔여석 확인 중'
  return remaining > 0 ? `잔여 ${remaining.toLocaleString('ko-KR')}석` : '매진'
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
        const remaining = remainingBySection.get(section.id)
        const selected = selectedBySection.get(section.id) ?? 0
        return (
          <button
            key={section.id}
            type="button"
            className={`stadium__section grade--${section.grade.toLowerCase()}`}
            style={{ gridArea: gridAreaOf(section) }}
            aria-pressed={section.id === activeSectionId}
            disabled={remaining === 0}
            onClick={() => onSelect(section.id)}
          >
            <span className="stadium__section-name">{section.name}</span>
            <span className="stadium__section-meta">
              {formatPrice(section.price)} · {remainingLabel(remaining)}
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
