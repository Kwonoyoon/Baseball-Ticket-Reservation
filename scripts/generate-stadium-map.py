# -*- coding: utf-8 -*-
"""잠실야구장 좌석 배치도 생성기 (직접 계산해 그린다)"""
import math

CX, CY = 500.0, 470.0
W = H = 1000
FONT = "Pretendard, 'Apple SD Gothic Neo', system-ui, sans-serif"
GAP = 1.6          # 블록 사이 간격(도)

def pt(r, a):
    rad = math.radians(a)
    return (CX + r * math.cos(rad), CY + r * math.sin(rad))

def fmt(p):
    return f"{p[0]:.1f} {p[1]:.1f}"

def sector(r_in, r_out, a0, a1):
    large = 1 if (a1 - a0) > 180 else 0
    p1, p2, p3, p4 = pt(r_out, a0), pt(r_out, a1), pt(r_in, a1), pt(r_in, a0)
    return (f"M {fmt(p1)} A {r_out} {r_out} 0 {large} 1 {fmt(p2)} "
            f"L {fmt(p3)} A {r_in} {r_in} 0 {large} 0 {fmt(p4)} Z")

# code, 이름, 색, 가격, r_in, r_out, a0, a1, 블록 수, (열, 열당 좌석)
BANDS = [
    ("OUTFIELD", "외야석",     "#2F8A57",  9000, 348, 412, 200, 340,  8, (12, 24)),
    ("NAVY",     "네이비석",   "#28356B", 12000, 404, 448,   0, 180, 12, (10, 22)),
    ("RED",      "레드석",     "#C23B4A", 16000, 356, 398,   2, 178, 10, (10, 20)),
    ("ORANGE",   "오렌지석",   "#E07B33", 18000, 306, 350,   4, 176, 10, ( 9, 20)),
    ("BLUE",     "블루석",     "#1F6FD0", 20000, 252, 300,   8, 172,  8, ( 8, 18)),
    ("TABLE",    "테이블석",   "#7B4BD1", 40000, 194, 246,  30,  66,  1, ( 4, 12)),
    ("TABLE",    "테이블석",   "#7B4BD1", 40000, 194, 246, 114, 150,  1, ( 4, 12)),
    ("PREMIUM",  "프리미엄석", "#2F86D6", 70000, 194, 246,  70, 110,  1, ( 5, 14)),
    ("EXCITING", "익사이팅존", "#D9A32B", 50000, 150, 188,   6,  48,  1, ( 4, 10)),
    ("EXCITING", "익사이팅존", "#D9A32B", 50000, 150, 188, 132, 174,  1, ( 4, 10)),
]

def build():
    raw = []
    for code, name, color, price, r_in, r_out, a0, a1, n, grid in BANDS:
        step = (a1 - a0) / n
        for i in range(n):
            b0, b1 = a0 + i * step + GAP / 2, a0 + (i + 1) * step - GAP / 2
            raw.append((code, name, color, price, r_in, r_out, b0, b1, grid))

    # 등급별로 3루(왼쪽) → 1루(오른쪽) 순서로 번호를 매긴다.
    # 아래쪽 띠는 각도가 180도에서 0도로 갈수록 오른쪽이고, 외야(위쪽)는 그 반대다.
    def order_key(item):
        mid = (item[6] + item[7]) / 2
        return -mid if mid < 180 else mid

    blocks, counter = [], {}
    for code, name, color, price, r_in, r_out, b0, b1, grid in sorted(raw, key=order_key):
        if True:
            counter[code] = counter.get(code, 0) + 1
            num = counter[code]
            mid = (b0 + b1) / 2
            blocks.append({
                "code": f"{code}-{num:02d}", "grade": code, "name": name, "color": color,
                "price": price, "num": num, "label": f"{name} {num}블록",
                "d": sector(r_in, r_out, b0, b1),
                "label_pos": pt((r_in + r_out) / 2, mid),
                "rotate": mid - 90 if mid < 180 else mid + 90,
                "rows": grid[0], "seats_per_row": grid[1], "seats": grid[0] * grid[1],
            })
    return blocks

def render(blocks):
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="잠실야구장 좌석 배치도">',
           '  <title>잠실야구장 좌석 배치도</title>',
           '  <rect width="1000" height="1000" fill="#F3F5F9"/>',
           f'  <circle cx="{CX}" cy="{CY}" r="462" fill="#FFFFFF" stroke="#DDE2EA" stroke-width="6"/>',
           '  <g aria-hidden="true" opacity="0.45">']
    for i in range(12):
        a0 = 180 + i * 15
        out.append(f'    <path d="{sector(0, 342, a0, a0 + 15)}" fill="{"#3E9A63" if i % 2 == 0 else "#358B58"}"/>')
    out.append(f'    <path d="{sector(0, 150, 0, 180)}" fill="#D7A874"/>')
    out.append(f'    <path d="{sector(146, 252, 0, 180)}" fill="#E8ECF3"/>')
    out.append(f'    <path d="{sector(0, 168, 196, 344)}" fill="#CE9A63"/>')
    out.append(f'    <path d="{sector(0, 142, 212, 328)}" fill="#3E9A63"/>')
    home, first, second, third = pt(0, 0), pt(124, 315), pt(175, 270), pt(124, 225)
    out.append(f'    <path d="M {fmt(home)} L {fmt(first)} L {fmt(second)} L {fmt(third)} Z" fill="none" stroke="#FFFFFF" stroke-width="4"/>')
    out.append(f'    <path d="M {fmt(home)} L {fmt(pt(342, 200))} M {fmt(home)} L {fmt(pt(342, 340))}" stroke="#FFFFFF" stroke-width="3"/>')
    mound = pt(92, 270)
    out.append(f'    <circle cx="{mound[0]:.1f}" cy="{mound[1]:.1f}" r="17" fill="#CE9A63"/>')
    out.append(f'    <circle cx="{CX}" cy="{CY}" r="8" fill="#FFFFFF"/>')
    out.append('  </g>')
    for a, label in [(205, "3루"), (335, "1루")]:
        x, y = pt(268, a)
        out.append(f'  <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
                   f'fill="#7C8798" font-size="17" font-weight="600" font-family="{FONT}">{label}</text>')

    for b in blocks:
        x, y = b["label_pos"]
        out.append(f'  <g class="block" data-section-code="{b["code"]}" data-grade="{b["grade"]}" '
                   f'role="button" tabindex="0" aria-label="{b["label"]} {b["price"]:,}원">')
        out.append(f'    <title>{b["label"]} · {b["price"]:,}원</title>')
        out.append(f'    <path d="{b["d"]}" fill="{b["color"]}" stroke="#FFFFFF" stroke-width="2.5"/>')
        out.append(f'    <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
                   f'fill="#FFFFFF" font-size="16" font-weight="700" font-family="{FONT}" '
                   f'transform="rotate({b["rotate"]:.0f} {x:.1f} {y:.1f})">{b["num"]}</text>')
        out.append('  </g>')

    out.append(f'  <text x="{CX:.0f}" y="46" text-anchor="middle" fill="#8A94A6" font-size="18" font-family="{FONT}">외야</text>')
    out.append(f'  <text x="{CX:.0f}" y="968" text-anchor="middle" fill="#8A94A6" font-size="18" font-family="{FONT}">홈플레이트 · 매표소 방향</text>')
    out.append('</svg>')
    return "\n".join(out)


GRADE_ENUM = {"OUTFIELD": "OUTFIELD", "NAVY": "NAVY", "RED": "RED", "ORANGE": "ORANGE",
              "BLUE": "BLUE", "TABLE": "TABLE", "PREMIUM": "PREMIUM", "EXCITING": "EXCITING"}
# V3 마이그레이션 시점의 구장 이름. V4에서 이름이 바뀌었지만 V3는 이미 적용되어 수정하면 안 된다.
# 블록 구성을 다시 만들 때는 이 파일이 아니라 새 버전(V5 등)으로 내보내야 한다.
STADIUM = "잠실야구장"
NL = chr(10)


def render_sql(blocks):
    lines = [
        "-- 잠실야구장 좌석 블록. 배치도(frontend/src/lib/jamsilMap.ts)와 zone_code로 1:1 대응한다.",
        "-- 기존 템플릿 구역은 예매 이력이 걸려 있으므로 지우지 않고 비활성 처리한다.",
        "",
        "ALTER TABLE seat_sections ADD COLUMN zone_code VARCHAR(20);",
        "ALTER TABLE seat_sections ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;",
        "",
        "CREATE INDEX idx_seat_sections_stadium_active ON seat_sections (stadium_id, active);",
        "",
        "UPDATE seat_sections SET active = FALSE",
        f"WHERE stadium_id = (SELECT id FROM stadiums WHERE name = '{STADIUM}');",
        "",
    ]
    for order, b in enumerate(blocks, start=1):
        lines.append(
            "INSERT INTO seat_sections "
            "(stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)" + NL +
            f"SELECT id, '{b['code']}', '{b['label']}', '{GRADE_ENUM[b['grade']]}', {b['price']}, "
            f"{b['rows']}, {b['seats_per_row']}, {order}, TRUE FROM stadiums WHERE name = '{STADIUM}';")
    return NL.join(lines) + NL


def render_ts(blocks):
    shapes = [(sector(0, 342, 180 + i * 15, 195 + i * 15), "#3E9A63" if i % 2 == 0 else "#358B58")
              for i in range(12)]
    shapes += [(sector(0, 150, 0, 180), "#D7A874"), (sector(146, 252, 0, 180), "#E8ECF3"),
               (sector(0, 168, 196, 344), "#CE9A63"), (sector(0, 142, 212, 328), "#3E9A63")]
    home, first, second, third = pt(0, 0), pt(124, 315), pt(175, 270), pt(124, 225)
    lines = [f"M {fmt(home)} L {fmt(first)} L {fmt(second)} L {fmt(third)} Z",
             f"M {fmt(home)} L {fmt(pt(342, 200))}",
             f"M {fmt(home)} L {fmt(pt(342, 340))}"]
    mound = pt(92, 270)
    marks = [(mound[0], mound[1], 17, "#CE9A63"), (CX, CY, 8, "#FFFFFF")]

    out = ["/** 잠실야구장 좌석 배치도 좌표. 생성기로 만든 파일이므로 직접 수정하지 않는다. */", "",
           "export type StadiumBlock = {",
           "  /** DB seat_sections.zoneCode 와 같은 값 */",
           "  code: string", "  grade: string", "  number: number",
           "  /** SVG path 데이터 */", "  d: string",
           "  labelX: number", "  labelY: number", "  labelRotate: number", "}", "",
           f"export const STADIUM_VIEW_BOX = '0 0 {W} {H}'",
           f"export const STADIUM_OUTLINE = {{ cx: {CX}, cy: {CY}, r: 462 }}", "",
           "/** 그라운드 배경. 클릭 대상이 아니다. */",
           "export const FIELD_SHAPES: { d: string; fill: string }[] = ["]
    out += [f"  {{ d: '{d}', fill: '{fill}' }}," for d, fill in shapes]
    out += ["]", "", "export const FIELD_LINES: string[] = ["]
    out += [f"  '{d}'," for d in lines]
    out += ["]", "", "export const FIELD_MARKS: { cx: number; cy: number; r: number; fill: string }[] = ["]
    out += [f"  {{ cx: {cx:.1f}, cy: {cy:.1f}, r: {r}, fill: '{fill}' }}," for cx, cy, r, fill in marks]
    out += ["]", "", "export const BASE_LABELS: { x: number; y: number; text: string }[] = ["]
    for a, label in [(205, "3루"), (335, "1루")]:
        x, y = pt(268, a)
        out.append(f"  {{ x: {x:.1f}, y: {y:.1f}, text: '{label}' }},")
    out += ["]", "", "export const STADIUM_BLOCKS: StadiumBlock[] = ["]
    for b in blocks:
        x, y = b["label_pos"]
        out.append(f"  {{ code: '{b['code']}', grade: '{b['grade']}', number: {b['num']}, "
                   f"labelX: {x:.1f}, labelY: {y:.1f}, labelRotate: {b['rotate']:.0f},")
        out.append(f"    d: '{b['d']}' }},")
    out += ["]", "", "export const STADIUM_BLOCK_CODES = new Set(STADIUM_BLOCKS.map((block) => block.code))", ""]
    return NL.join(out) + NL

if __name__ == "__main__":
    blocks = build()
    open("jamsil-stadium.svg", "w", encoding="utf-8", newline="\n").write(render(blocks))
    open("V3__jamsil_stadium_blocks.sql", "w", encoding="utf-8", newline=NL).write(render_sql(blocks))
    open("jamsilMap.ts", "w", encoding="utf-8", newline=NL).write(render_ts(blocks))
    total = sum(b["seats"] for b in blocks)
    print(f"블록 {len(blocks)}개 / 전체 좌석 {total:,}석")
    for code in dict.fromkeys(b["grade"] for b in blocks):
        rows = [b for b in blocks if b["grade"] == code]
        print(f"  {rows[0]['name']:<10} 블록 {len(rows):>2}개 · 블록당 {rows[0]['rows']}열 × {rows[0]['seats_per_row']}석 = {rows[0]['seats']:>3}석 · 합계 {sum(r['seats'] for r in rows):,}석")
