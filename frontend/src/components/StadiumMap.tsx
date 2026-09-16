import type { KeyboardEvent, MouseEvent } from 'react'
import type { SeatSection } from '../api/types'
import { formatPrice } from '../lib/format'
import {
  BASE_LABELS,
  FIELD_LINES,
  FIELD_MARKS,
  FIELD_SHAPES,
  STADIUM_BLOCKS,
  STADIUM_OUTLINE,
  STADIUM_VIEW_BOX,
} from '../lib/jamsilMap'
import { remainingLabel } from '../lib/stadiumMap'

type StadiumMapProps = {
  sections: SeatSection[]
  activeSectionId: number | null
  /** 구역별 잔여석. 아직 불러오지 못한 구역은 값이 없다. */
  remainingBySection: ReadonlyMap<number, number>
  selectedBySection: ReadonlyMap<number, number>
  /** 블록을 고르면 구역 ID, 빈 곳을 누르면 null */
  onSelect: (sectionId: number | null) => void
}

export function StadiumMap({
  sections,
  activeSectionId,
  remainingBySection,
  selectedBySection,
  onSelect,
}: StadiumMapProps) {
  const sectionByCode = new Map(
    sections.filter((section) => section.code !== null).map((section) => [section.code as string, section]),
  )

  // 범례는 등급 단위로 묶어서 보여준다. (블록이 53개라 블록마다 적으면 읽기 어렵다)
  const grades = new Map<string, { label: string; grade: string; price: number; remaining: number | undefined }>()
  for (const section of sections) {
    const current = grades.get(section.grade)
    const remaining = remainingBySection.get(section.id)
    grades.set(section.grade, {
      label: section.gradeLabel,
      grade: section.grade,
      price: Math.min(current?.price ?? section.price, section.price),
      remaining:
        remaining === undefined ? current?.remaining : (current?.remaining ?? 0) + remaining,
    })
  }

  // 블록이 아닌 곳을 누르면 선택을 푼다.
  const handleBackgroundClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!(event.target as Element).closest('.stadium-map__block')) onSelect(null)
  }

  const handleEscape = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Escape') onSelect(null)
  }

  return (
    <div className="stadium-map">
      <svg
        viewBox={STADIUM_VIEW_BOX}
        role="group"
        aria-label="좌석 배치도"
        onClick={handleBackgroundClick}
        onKeyDown={handleEscape}
      >
        <circle
          cx={STADIUM_OUTLINE.cx}
          cy={STADIUM_OUTLINE.cy}
          r={STADIUM_OUTLINE.r}
          fill="#FFFFFF"
          stroke="#DDE2EA"
          strokeWidth={6}
        />
        <g className="stadium-map__field" aria-hidden="true">
          {FIELD_SHAPES.map((shape) => (
            <path key={shape.d} d={shape.d} fill={shape.fill} />
          ))}
          {FIELD_LINES.map((d) => (
            <path key={d} d={d} fill="none" stroke="#FFFFFF" strokeWidth={4} />
          ))}
          {FIELD_MARKS.map((mark) => (
            <circle key={`${mark.cx}-${mark.cy}`} cx={mark.cx} cy={mark.cy} r={mark.r} fill={mark.fill} />
          ))}
        </g>

        {BASE_LABELS.map((label) => (
          <text key={label.text} className="stadium-map__base" x={label.x} y={label.y} aria-hidden="true">
            {label.text}
          </text>
        ))}

        {STADIUM_BLOCKS.map((block) => {
          const section = sectionByCode.get(block.code)
          if (!section) return null

          const remaining = remainingBySection.get(section.id)
          const soldOut = remaining === 0
          const selected = (selectedBySection.get(section.id) ?? 0) > 0
          const isActive = section.id === activeSectionId
          const classes = [
            'stadium-map__block',
            `grade--${section.grade.toLowerCase()}`,
            isActive ? 'is-active' : '',
            // 고른 구역만 또렷하게 남기고 나머지는 흐리게 한다.
            activeSectionId !== null && !isActive ? 'is-dimmed' : '',
            selected ? 'is-selected' : '',
            soldOut ? 'is-sold-out' : '',
          ]
            .filter(Boolean)
            .join(' ')

          const select = () => {
            if (!soldOut) onSelect(section.id)
          }
          const handleKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              select()
            }
          }

          return (
            <g key={block.code} className={classes}>
              <path
                d={block.d}
                role="button"
                tabIndex={soldOut ? -1 : 0}
                aria-disabled={soldOut}
                aria-pressed={isActive}
                aria-label={`${section.name} ${formatPrice(section.price)} ${remainingLabel(remaining)}`}
                onClick={select}
                onKeyDown={handleKeyDown}
              />
              <text
                className="stadium-map__number"
                x={block.labelX}
                y={block.labelY}
                transform={`rotate(${block.labelRotate} ${block.labelX} ${block.labelY})`}
                aria-hidden="true"
              >
                {block.number}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="stadium-legend" aria-label="좌석 등급">
        {[...grades.values()].map((grade) => (
          <li key={grade.grade} className={`grade--${grade.grade.toLowerCase()}`}>
            <span className="stadium-legend__chip" aria-hidden="true" />
            {grade.label} <strong>{formatPrice(grade.price)}</strong>
            <span className="stadium-legend__remaining">{remainingLabel(grade.remaining)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
