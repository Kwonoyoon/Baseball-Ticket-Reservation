import type { StadiumLayout } from '../lib/stadiumMaps'

type StadiumGroundProps = {
  layout: StadiumLayout
  /** 그라운드 묶음에 붙일 클래스 (화면마다 흐리기 정도가 다르다) */
  fieldClassName: string
}

/**
 * 좌석 블록 아래에 까는 구장 바탕: 바깥 모양, 장식(돔 지붕 등), 그라운드, 담장.
 * 모두 클릭 대상이 아니고 화면 낭독기에도 읽히지 않는다. 블록은 이 위에 각 화면이 그린다.
 */
export function StadiumGround({ layout, fieldClassName }: StadiumGroundProps) {
  return (
    <>
      <path d={layout.outline} fill="#FFFFFF" stroke="#DDE2EA" strokeWidth={6} aria-hidden="true" />
      {layout.decor.map((shape, index) => (
        <path key={`decor-${index}`} d={shape.d} fill={shape.fill} aria-hidden="true" />
      ))}
      <g className={fieldClassName} aria-hidden="true">
        {layout.fieldShapes.map((shape, index) => (
          <path key={`field-${index}`} d={shape.d} fill={shape.fill} />
        ))}
        {layout.fieldLines.map((d) => (
          <path key={d} d={d} fill="none" stroke="#FFFFFF" strokeWidth={4} />
        ))}
        {layout.fieldMarks.map((mark) => (
          <circle key={`${mark.cx}-${mark.cy}`} cx={mark.cx} cy={mark.cy} r={mark.r} fill={mark.fill} />
        ))}
      </g>
      {layout.walls.map((shape, index) => (
        <path key={`wall-${index}`} d={shape.d} fill={shape.fill} aria-hidden="true" />
      ))}
    </>
  )
}
