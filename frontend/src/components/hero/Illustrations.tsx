/**
 * 메인 슬라이드에 쓰는 야구 일러스트. 이미지 파일 없이 SVG로 그려서 어떤 크기에서도 선명하고, 색은 CSS 변수로 바꿀 수 있다.
 * 모두 장식이라 화면 낭독기에서는 숨긴다.
 */

type Props = { className?: string }

/** 야구공. 흰 공에 빨간 실밥 */
export function BallIllustration({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="ball-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f1f3f6" />
          <stop offset="1" stopColor="#cfd5df" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#ball-shade)" stroke="#b9c1ce" strokeWidth="2" />
      <path d="M28 18c14 14 14 70 0 84" fill="none" stroke="#d9381e" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 18c-14 14-14 70 0 84" fill="none" stroke="#d9381e" strokeWidth="3" strokeLinecap="round" />
      {[28, 40, 52, 64, 76, 88].map((y, i) => (
        <g key={y} stroke="#d9381e" strokeWidth="2.4" strokeLinecap="round">
          <path d={`M${22 + (i % 3) * 2} ${y}l9 ${i % 2 ? 3 : -3}`} />
          <path d={`M${98 - (i % 3) * 2} ${y}l-9 ${i % 2 ? 3 : -3}`} />
        </g>
      ))}
    </svg>
  )
}

/** 방망이 */
export function BatIllustration({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 240 40" aria-hidden="true">
      <defs>
        <linearGradient id="bat-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9c58f" />
          <stop offset="1" stopColor="#b98a4b" />
        </linearGradient>
      </defs>
      <path
        d="M6 17h26c24 0 60-3 120-8 30-2.500 62-1 74 3 8 2.500 8 13 0 16-12 4-44 5.500-74 3C92 28 56 25 32 25H6a4 4 0 0 1-4-4v0a4 4 0 0 1 4-4z"
        fill="url(#bat-wood)"
      />
      <rect x="2" y="15" width="10" height="12" rx="4" fill="#3b2a1a" />
      <path d="M40 13v14M44 13v14" stroke="#8a5d2c" strokeWidth="1.600" opacity="0.5" />
    </svg>
  )
}

/** 글러브 */
export function GloveIllustration({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M30 96c-8-14-12-34-10-50 1-8 6-9 9-4l3 8c1-10 2-24 5-30 2-6 8-5 9 1l1 22c2-12 4-28 8-34 3-5 9-3 9 3l-1 30c3-8 7-20 12-24 4-3 9 0 8 5-2 14-5 26-9 38 6 4 8 14 3 22-8 10-26 12-38 8-9-3-14-8-20-18z"
        fill="#b9622b"
        stroke="#7c3f17"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M44 76c10 6 22 6 34 0"
        fill="none"
        stroke="#7c3f17"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx="62" cy="70" rx="14" ry="10" fill="#d58246" opacity="0.55" />
    </svg>
  )
}

/** 야구장 다이아몬드(내야). 슬라이드 뒤에 깔리는 은은한 경기장 무늬 */
export function FieldIllustration({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 400 300" aria-hidden="true">
      <path d="M200 20L380 190 200 280 20 190z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M200 70L316 180 200 244 84 180z" fill="none" stroke="currentColor" strokeWidth="1.600" />
      <circle cx="200" cy="170" r="12" fill="none" stroke="currentColor" strokeWidth="1.600" />
      {[
        [200, 70],
        [316, 180],
        [84, 180],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x - 7}
          y={y - 7}
          width="14"
          height="14"
          transform={`rotate(45 ${x} ${y})`}
          fill="currentColor"
        />
      ))}
      <path d="M192 250h16l-4 10h-8z" fill="currentColor" />
      <path
        d="M200 20c70 10 130 50 180 170M200 20C130 30 70 70 20 190"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.600"
      />
    </svg>
  )
}

/** 이벤트 슬라이드의 큰 그림: 경기장 위에 공, 방망이, 글러브 */
export function EventIllustration({ className }: Props) {
  return (
    <div className={className} aria-hidden="true">
      <FieldIllustration className="hs-art__field" />
      <BallIllustration className="hs-art__ball" />
      <BatIllustration className="hs-art__bat" />
      <GloveIllustration className="hs-art__glove" />
      <span className="hs-art__spark hs-art__spark--a" />
      <span className="hs-art__spark hs-art__spark--b" />
      <span className="hs-art__spark hs-art__spark--c" />
    </div>
  )
}
