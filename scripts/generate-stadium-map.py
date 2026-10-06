# -*- coding: utf-8 -*-
"""구장별 좌석 배치도 생성기 (외부 자료 없이 좌표를 직접 계산해 그린다)

구장마다 바깥 모양·펜스·좌석 등급·블록 수·가격이 다르다. 실제 구장을 참고해 특징을 살렸지만
정확한 실측 도면은 아니다(학습용). 한 번 돌리면 아래 파일이 나온다.

  out/stadiumMaps.ts          → frontend/src/lib/stadiumMaps.ts 로 복사
  out/stadium-blocks.sql      → 새 마이그레이션 파일 내용 (잠실을 뺀 8개 구장의 블록)
  out/stadium-<CODE>.svg      → 눈으로 확인하는 미리보기

잠실은 이미 블록이 DB에 있고 예매 이력이 걸려 있으므로 설정을 바꾸지 않는다(바꾸면 기존 예매 좌석 위치가 어긋난다).
다른 구장도 한 번 배포한 뒤에는 블록 코드·크기를 바꾸지 말고, 바꿔야 하면 새 코드로 블록을 추가할 것.
"""
import math
import os

CX, CY = 500.0, 470.0
W = H = 1000
FONT = "Pretendard, 'Apple SD Gothic Neo', system-ui, sans-serif"
GAP = 1.6          # 블록 사이 간격(도)
NL = chr(10)

# 화면 각도: 0도가 오른쪽(1루 쪽), 90도가 아래(포수 뒤), 180도가 왼쪽(3루 쪽), 270도가 위(중견수 쪽)


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


def wedge(fence, a0, a1):
    """가운데(홈)에서 펜스까지 부채꼴. 펜스 거리가 각도마다 다르면 꺾은선으로 그린다."""
    if fence(a0) == fence(a1) == fence((a0 + a1) / 2):
        return sector(0, fence(a0), a0, a1)
    pts = [pt(fence(a), a) for a in frange(a0, a1, 1.0)]
    return f"M {fmt(pt(0, 0))} " + " ".join(f"L {fmt(p)}" for p in pts) + " Z"


def band_path(r_in, r_out, a0, a1):
    """두 반지름 사이 띠(돔 지붕 테두리 등)."""
    return sector(r_in, r_out, a0, a1)


def fence_band(fence, a0, a1, thickness):
    """펜스를 따라 바깥쪽으로 두께만큼 그린 띠(높은 담장 등)."""
    outer = [pt(fence(a) + thickness, a) for a in frange(a0, a1, 1.0)]
    inner = [pt(fence(a), a) for a in reversed(frange(a0, a1, 1.0))]
    return "M " + " L ".join(fmt(p) for p in outer + inner) + " Z"


def frange(a, b, step):
    n = max(1, int(round((b - a) / step)))
    return [a + (b - a) * i / n for i in range(n + 1)]


# ---------------------------------------------------------------- 바깥 모양

def circle(r, cx=CX, cy=CY):
    return f"M {cx - r:.1f} {cy:.1f} A {r} {r} 0 1 0 {cx + r:.1f} {cy:.1f} A {r} {r} 0 1 0 {cx - r:.1f} {cy:.1f} Z"


def ellipse(rx, ry, cx=CX, cy=CY):
    return (f"M {cx - rx:.1f} {cy:.1f} A {rx} {ry} 0 1 0 {cx + rx:.1f} {cy:.1f} "
            f"A {rx} {ry} 0 1 0 {cx - rx:.1f} {cy:.1f} Z")


def octagon(r):
    pts = [pt(r, 22.5 + 45 * i) for i in range(8)]
    return "M " + " L ".join(fmt(p) for p in pts) + " Z"


def rounded_rect(x0, y0, x1, y1, rad):
    return (f"M {x0 + rad} {y0} H {x1 - rad} A {rad} {rad} 0 0 1 {x1} {y0 + rad} V {y1 - rad} "
            f"A {rad} {rad} 0 0 1 {x1 - rad} {y1} H {x0 + rad} A {rad} {rad} 0 0 1 {x0} {y1 - rad} "
            f"V {y0 + rad} A {rad} {rad} 0 0 1 {x0 + rad} {y0} Z")


def const(r):
    return lambda a: r


def asym(left, center, right):
    """왼쪽(200도)·가운데(270도)·오른쪽(340도) 펜스 거리를 부드럽게 잇는다."""
    def f(a):
        if a <= 270:
            t = (a - 200) / 70
            return left + (center - left) * math.sin(t * math.pi / 2)
        t = (a - 270) / 70
        return center + (right - center) * (1 - math.cos(t * math.pi / 2))
    return f


# ---------------------------------------------------------------- 구장 설정
# 블록 띠: (코드 접두어, 등급, 이름, 가격, r_in, r_out, a0, a1, 블록 수, (열, 열당 좌석))
#   등급은 색을 정한다(SeatGrade). 이름은 화면과 DB 구역 이름에 그대로 쓴다.
#   같은 구장 안에서 코드 접두어가 같으면 번호가 이어진다.

JAMSIL_BANDS = [
    ("OUTFIELD", "OUTFIELD", "외야석",     9000, 348, 412, 200, 340,  8, (12, 24)),
    ("NAVY",     "NAVY",     "네이비석",  12000, 404, 448,   0, 180, 12, (10, 22)),
    ("RED",      "RED",      "레드석",    16000, 356, 398,   2, 178, 10, (10, 20)),
    ("ORANGE",   "ORANGE",   "오렌지석",  18000, 306, 350,   4, 176, 10, ( 9, 20)),
    ("BLUE",     "BLUE",     "블루석",    20000, 252, 300,   8, 172,  8, ( 8, 18)),
    ("TABLE",    "TABLE",    "테이블석",  40000, 194, 246,  30,  66,  1, ( 4, 12)),
    ("TABLE",    "TABLE",    "테이블석",  40000, 194, 246, 114, 150,  1, ( 4, 12)),
    ("PREMIUM",  "PREMIUM",  "프리미엄석", 70000, 194, 246, 70, 110,  1, ( 5, 14)),
    ("EXCITING", "EXCITING", "익사이팅존", 50000, 150, 188,  6,  48,  1, ( 4, 10)),
    ("EXCITING", "EXCITING", "익사이팅존", 50000, 150, 188, 132, 174, 1, ( 4, 10)),
]

# 대전은 오른쪽 펜스가 가깝다. 담장(몬스터월)도 이 펜스를 따라 그린다.
DAEJEON_FENCE = asym(338, 352, 298)

STADIUMS = [
    {
        # 잠실: 기존 도면 그대로 (이미 DB에 블록이 있다)
        "code": "JAMSIL", "name": "서울종합운동장 야구장", "existing": True,
        "outline": circle(462), "fence": const(342),
        "bands": JAMSIL_BANDS,
    },
    {
        # 고척: 국내 유일 돔. 지붕 테두리, 1·2·3층 내야석, 포수 뒤 다이아몬드석
        "code": "GOCHEOK", "capacity": 16000, "name": "고척 스카이돔",
        "outline": circle(462), "fence": const(318),
        "decor": [
            # 한 바퀴를 한 번에 이으면 호의 시작점과 끝점이 같아 그려지지 않으므로 반원 두 개로 나눈다.
            {"d": band_path(420, 458, 0, 180), "fill": "#5B6472"},
            {"d": band_path(420, 458, 180, 360), "fill": "#5B6472"},
            *[{"d": band_path(420, 458, a, a + 1.2), "fill": "#8A94A6"} for a in range(0, 360, 15)],
        ],
        "bands": [
            ("DIAMOND", "PREMIUM",  "다이아몬드석", 70000, 156, 196,  62, 118,  3, (5, 14)),
            ("TABLE",   "TABLE",    "테이블석",    45000, 156, 196,  18,  58,  2, (4, 12)),
            ("TABLE",   "TABLE",    "테이블석",    45000, 156, 196, 122, 162,  2, (4, 12)),
            ("CHEER",   "CHEER",    "응원지정석",  16000, 206, 258,   4,  44,  3, (9, 18)),
            ("LOWER",   "BLUE",     "1층 내야석",  20000, 206, 258,  48, 176,  8, (9, 18)),
            ("MIDDLE",  "SKY",      "2층 내야석",  14000, 268, 316,   6, 174, 10, (8, 18)),
            ("UPPER",   "NAVY",     "3층 내야석",   9000, 326, 372,  10, 170, 10, (8, 20)),
            ("OUTFIELD", "OUTFIELD", "외야석",      8000, 332, 404, 198, 342,  8, (10, 22)),
        ],
    },
    {
        # 인천: 포수 뒤 라이브존, 외야 바비큐존·그린존, 상단 스카이뷰
        "code": "MUNHAK", "capacity": 23000, "name": "인천 SSG 랜더스필드",
        "outline": circle(462), "fence": const(334),
        "bands": [
            ("LIVE",     "EXCITING", "랜더스 라이브존", 80000, 150, 188,  64, 116,  2, (4, 12)),
            ("PREMIUM",  "PREMIUM",  "프리미엄석",     60000, 196, 240,  64, 116,  2, (5, 14)),
            ("TABLE",    "TABLE",    "테이블석",       45000, 196, 240,  24,  60,  2, (4, 12)),
            ("TABLE",    "TABLE",    "테이블석",       45000, 196, 240, 120, 156,  2, (4, 12)),
            ("CHEER",    "CHEER",    "응원지정석",     16000, 250, 300,   4,  50,  4, (9, 20)),
            ("FIELD",    "RED",      "내야필드석",     20000, 250, 300,  54, 176,  9, (9, 20)),
            ("SKYVIEW",  "SKY",      "스카이뷰석",     10000, 310, 360,   6, 174, 12, (8, 22)),
            ("BBQ",      "PARTY",    "바비큐존",       50000, 348, 398, 198, 232,  2, (4, 10)),
            ("GREEN",    "GRASS",    "외야 그린존",     9000, 348, 404, 236, 298,  4, (8, 24)),
            ("OUTFIELD", "OUTFIELD", "외야석",         10000, 348, 404, 302, 342,  3, (10, 22)),
        ],
    },
    {
        # 수원: 우중간 외야 잔디석, 상단 스카이존, 양쪽 익사이팅석
        "code": "SUWON", "capacity": 18700, "name": "수원 케이티 위즈 파크",
        "outline": circle(462), "fence": const(326),
        "bands": [
            ("EXCITING", "EXCITING", "익사이팅석",  40000, 150, 188,   8,  50,  1, (4, 10)),
            ("EXCITING", "EXCITING", "익사이팅석",  40000, 150, 188, 130, 172,  1, (4, 10)),
            ("TABLE",    "TABLE",    "중앙테이블석", 40000, 196, 240,  56, 124,  3, (5, 12)),
            ("CHEER",    "CHEER",    "응원지정석",  15000, 250, 298,   4,  56,  4, (9, 18)),
            ("CENTER",   "BLUE",     "중앙지정석",  22000, 250, 298,  60, 120,  3, (9, 18)),
            ("INFIELD",  "ORANGE",   "내야지정석",  15000, 250, 298, 124, 176,  4, (9, 18)),
            ("SKY",      "SKY",      "스카이존",     9000, 308, 354,  10, 170, 10, (8, 20)),
            ("GRASS",    "GRASS",    "외야 잔디석",   7000, 340, 404, 268, 340,  3, (8, 26)),
            ("OUTFIELD", "OUTFIELD", "외야석",       9000, 340, 400, 198, 264,  4, (10, 22)),
        ],
    },
    {
        # 대전: 오른쪽 펜스가 가깝고 높은 담장(몬스터월), 외야 인피니티풀 파티석
        "code": "DAEJEON", "capacity": 17000, "name": "대전 한화생명 볼파크",
        "outline": circle(462), "fence": DAEJEON_FENCE,
        "walls": [{"d": fence_band(DAEJEON_FENCE, 308, 341, 12), "fill": "#1F4A30"}],
        "landmarks": [(*pt(DAEJEON_FENCE(325) - 30, 325), "몬스터월")],
        "bands": [
            ("CATCHER",  "PREMIUM",  "포수후면석",     60000, 150, 190,  66, 114,  2, (5, 12)),
            ("TABLE",    "TABLE",    "테이블석",       40000, 198, 240,  26,  62,  2, (4, 12)),
            ("TABLE",    "TABLE",    "테이블석",       40000, 198, 240, 118, 154,  2, (4, 12)),
            ("CHEER",    "CHEER",    "응원단석",       15000, 250, 298,   4,  52,  4, (9, 18)),
            ("INFIELD",  "ORANGE",   "내야지정석",     18000, 250, 298,  56, 176,  9, (9, 18)),
            ("UPPER",    "SKY",      "2층 내야석",     11000, 308, 352,   8, 172, 10, (8, 20)),
            ("OUTFIELD", "OUTFIELD", "외야지정석",      9000, 362, 410, 198, 290,  6, (9, 22)),
            ("POOL",     "PARTY",    "인피니티풀 파티석", 60000, 352, 400, 296, 340, 2, (3, 8)),
        ],
    },
    {
        # 대구: 팔각형 구장. 3루 쪽 블루존 응원석, 외야 잔디석, 상단 스카이석
        "code": "DAEGU", "capacity": 24000, "name": "대구 삼성 라이온즈 파크",
        "outline": octagon(474), "fence": const(334),
        "bands": [
            ("VIP",      "PREMIUM",  "VIP석",       70000, 150, 190,  66, 114,  2, (5, 12)),
            ("TABLE",    "TABLE",    "테이블석",    35000, 198, 240,  26,  62,  2, (4, 12)),
            ("TABLE",    "TABLE",    "테이블석",    35000, 198, 240, 118, 154,  2, (4, 12)),
            ("BLUEZONE", "CHEER",    "블루존",      16000, 250, 298, 128, 176,  4, (9, 20)),
            ("INFIELD",  "BLUE",     "내야지정석",  15000, 250, 298,   4, 124,  9, (9, 20)),
            ("SKY",      "SKY",      "스카이석",     9000, 308, 354,   6, 174, 12, (8, 22)),
            ("GRASS",    "GRASS",    "외야 잔디석",   7000, 342, 404, 198, 262,  3, (8, 26)),
            ("OUTFIELD", "OUTFIELD", "외야지정석",    9000, 342, 400, 266, 342,  5, (10, 22)),
        ],
    },
    {
        # 광주: 둥근 네모꼴. 포수 뒤 챔피언석, 3루 쪽 응원특별석, 외야 파티석
        "code": "GWANGJU", "capacity": 20500, "name": "광주-기아 챔피언스 필드",
        "outline": rounded_rect(36, 14, 964, 926, 210), "fence": const(336),
        "bands": [
            ("CHAMPION", "PREMIUM",  "챔피언석",     60000, 150, 190,  60, 120,  3, (5, 12)),
            ("TABLE",    "TABLE",    "중앙테이블석", 40000, 198, 240,  62, 118,  2, (4, 12)),
            ("CHEER",    "CHEER",    "응원특별석",   15000, 250, 298, 128, 176,  4, (9, 20)),
            ("INFIELD",  "RED",      "내야지정석",   15000, 250, 298,   4, 124,  9, (9, 20)),
            ("SKYTABLE", "TABLE",    "스카이테이블석", 30000, 308, 352, 72, 108,  2, (4, 12)),
            ("SKY",      "SKY",      "스카이석",      9000, 308, 352,   6,  68,  5, (8, 20)),
            ("SKY",      "SKY",      "스카이석",      9000, 308, 352, 112, 174,  5, (8, 20)),
            ("PARTY",    "PARTY",    "외야 파티석",   40000, 346, 396, 198, 230,  2, (4, 10)),
            ("OUTFIELD", "OUTFIELD", "외야석",        8000, 346, 400, 234, 342,  6, (10, 22)),
        ],
    },
    {
        # 창원: 펜스가 비대칭이고, 3층 내야석은 가운데에만 있다. 외야는 넓은 잔디석
        "code": "CHANGWON", "capacity": 17900, "name": "창원 NC 파크",
        "outline": ellipse(474, 456, 500, 470), "fence": asym(336, 348, 314),
        "bands": [
            ("PREMIUM",  "PREMIUM",  "프리미엄석",  60000, 150, 190,  66, 114,  2, (5, 12)),
            ("TABLE",    "TABLE",    "테이블석",    40000, 198, 240,  22,  62,  2, (4, 12)),
            ("TABLE",    "TABLE",    "테이블석",    40000, 198, 240, 118, 158,  2, (4, 12)),
            ("CHEER",    "CHEER",    "응원석",      15000, 250, 298,   4,  52,  4, (9, 18)),
            ("INFIELD",  "NAVY",     "내야석",      15000, 250, 298,  56, 176,  9, (9, 18)),
            ("UPPER",    "SKY",      "3층 내야석",   9000, 308, 352,  40, 140,  6, (8, 20)),
            ("GRASS",    "GRASS",    "외야 잔디석",   7000, 354, 412, 198, 300,  4, (8, 28)),
            ("OUTFIELD", "OUTFIELD", "외야석",       9000, 346, 400, 304, 342,  3, (10, 20)),
        ],
    },
    {
        # 사직: 가파르게 높은 관중석. 중앙·와이드탁자석, 1루 응원석, 내야 필드석·상단석
        "code": "SAJIK", "capacity": 22700, "name": "사직 야구장",
        "outline": ellipse(462, 470, 500, 470), "fence": const(334),
        "bands": [
            ("CTABLE",   "TABLE",    "중앙탁자석",  45000, 150, 195,  62, 118,  3, (4, 12)),
            ("WTABLE",   "TABLE",    "와이드탁자석", 35000, 150, 195,  22,  58,  1, (4, 14)),
            ("WTABLE",   "TABLE",    "와이드탁자석", 35000, 150, 195, 122, 158,  1, (4, 14)),
            ("CHEER",    "CHEER",    "응원석",      15000, 205, 255,   4,  56,  4, (10, 18)),
            ("FIELD",    "RED",      "내야 필드석",  18000, 205, 255,  60, 176,  9, (10, 18)),
            ("UPPER",    "NAVY",     "내야 상단석",  10000, 265, 322,   6, 174, 12, (10, 22)),
            ("OUTFIELD", "OUTFIELD", "외야석",       8000, 346, 404, 198, 342,  8, (11, 22)),
        ],
    },
]


# 실제 수용 인원(대략)에 이 비율을 곱한 만큼 좌석을 만든다. 잠실 23,750석 → 도면 10,142석과 같은 비율.
CAPACITY_RATIO = 10142 / 23750


def scaled_bands(stadium):
    """capacity가 있으면 블록마다 열 수·열당 좌석 수를 같은 비율로 늘려 전체 좌석을 맞춘다."""
    bands = stadium["bands"]
    if "capacity" not in stadium:
        return bands
    total = sum(b[8] * b[9][0] * b[9][1] for b in bands)
    k = math.sqrt(stadium["capacity"] * CAPACITY_RATIO / total)
    return [(*b[:9], (max(3, round(b[9][0] * k)), max(6, round(b[9][1] * k)))) for b in bands]


def build(stadium):
    raw = []
    for key, grade, name, price, r_in, r_out, a0, a1, n, grid in scaled_bands(stadium):
        step = (a1 - a0) / n
        for i in range(n):
            b0, b1 = a0 + i * step + GAP / 2, a0 + (i + 1) * step - GAP / 2
            raw.append((key, grade, name, price, r_in, r_out, b0, b1, grid))

    # 같은 접두어끼리 3루(왼쪽) → 1루(오른쪽) 순서로 번호를 매긴다.
    # 아래쪽 띠는 각도가 180도에서 0도로 갈수록 오른쪽이고, 외야(위쪽)는 그 반대다.
    def order_key(item):
        mid = (item[6] + item[7]) / 2
        return -mid if mid < 180 else mid

    blocks, counter = [], {}
    for key, grade, name, price, r_in, r_out, b0, b1, grid in sorted(raw, key=order_key):
        counter[key] = counter.get(key, 0) + 1
        num = counter[key]
        mid = (b0 + b1) / 2
        blocks.append({
            "code": f"{key}-{num:02d}", "grade": grade, "name": name,
            "price": price, "num": num, "label": f"{name} {num}번",
            "d": sector(r_in, r_out, b0, b1),
            "label_pos": pt((r_in + r_out) / 2, mid),
            "rotate": mid - 90 if mid < 180 else mid + 90,
            "rows": grid[0], "seats_per_row": grid[1], "seats": grid[0] * grid[1],
        })
    codes = [b["code"] for b in blocks]
    assert len(codes) == len(set(codes)), f"{stadium['code']} 블록 코드가 겹친다"
    assert all(len(c) <= 20 for c in codes), "zone_code는 20자까지"
    check_overlaps(stadium)
    return blocks


def check_overlaps(stadium):
    """같은 반지름대에서 각도가 겹치는 띠, 펜스 안으로 들어온 외야 띠를 막는다."""
    bands = stadium["bands"]
    for i, a in enumerate(bands):
        for b in bands[i + 1:]:
            radial = a[4] < b[5] and b[4] < a[5]
            angular = a[6] < b[7] and b[6] < a[7]
            assert not (radial and angular), f"{stadium['code']}: {a[2]}와 {b[2]}가 겹친다"
        if a[6] >= 180:
            for ang in frange(a[6], a[7], 2):
                assert a[4] > stadium["fence"](ang) + 4, f"{stadium['code']}: {a[2]}가 펜스 안으로 들어왔다"


def field(stadium):
    fence = stadium["fence"]
    shapes = [(wedge(fence, 180 + i * 15, 195 + i * 15), "#3E9A63" if i % 2 == 0 else "#358B58")
              for i in range(12)]
    shapes += [(sector(0, 150, 0, 180), "#D7A874"), (sector(146, 252, 0, 180), "#E8ECF3"),
               (sector(0, 168, 196, 344), "#CE9A63"), (sector(0, 142, 212, 328), "#3E9A63")]
    home, first, second, third = pt(0, 0), pt(124, 315), pt(175, 270), pt(124, 225)
    lines = [f"M {fmt(home)} L {fmt(first)} L {fmt(second)} L {fmt(third)} Z",
             f"M {fmt(home)} L {fmt(pt(fence(200), 200))}",
             f"M {fmt(home)} L {fmt(pt(fence(340), 340))}"]
    mound = pt(92, 270)
    marks = [(mound[0], mound[1], 17, "#CE9A63"), (CX, CY, 8, "#FFFFFF")]
    bases = []
    for a, label in [(205, "3루"), (335, "1루")]:
        x, y = pt(268, a)
        bases.append((x, y, label))
    return shapes, lines, marks, bases


# ---------------------------------------------------------------- 미리보기 SVG

def render_svg(stadium, blocks):
    shapes, lines, marks, bases = field(stadium)
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" '
           f'aria-label="{stadium["name"]} 좌석 배치도">',
           f'  <title>{stadium["name"]} 좌석 배치도</title>',
           '  <rect width="1000" height="1000" fill="#F3F5F9"/>',
           f'  <path d="{stadium["outline"]}" fill="#FFFFFF" stroke="#DDE2EA" stroke-width="6"/>']
    out += [f'  <path d="{s["d"]}" fill="{s["fill"]}"/>' for s in stadium.get("decor", [])]
    out.append('  <g opacity="0.45">')
    out += [f'    <path d="{d}" fill="{fill}"/>' for d, fill in shapes]
    out += [f'    <path d="{d}" fill="none" stroke="#FFFFFF" stroke-width="4"/>' for d in lines]
    out += [f'    <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}"/>' for cx, cy, r, fill in marks]
    out.append('  </g>')
    out += [f'  <path d="{s["d"]}" fill="{s["fill"]}"/>' for s in stadium.get("walls", [])]
    for x, y, text in bases + stadium.get("landmarks", []):
        out.append(f'  <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
                   f'fill="#7C8798" font-size="17" font-weight="600" font-family="{FONT}">{text}</text>')
    for b in blocks:
        x, y = b["label_pos"]
        out.append(f'  <path d="{b["d"]}" fill="{PREVIEW_COLORS[b["grade"]]}" stroke="#FFFFFF" stroke-width="2.5">'
                   f'<title>{b["label"]} · {b["price"]:,}원</title></path>')
        out.append(f'  <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
                   f'fill="#FFFFFF" font-size="16" font-weight="700" font-family="{FONT}" '
                   f'transform="rotate({b["rotate"]:.0f} {x:.1f} {y:.1f})">{b["num"]}</text>')
    out.append('</svg>')
    return NL.join(out) + NL


# 미리보기 전용 색. 실제 화면 색은 frontend/src/index.css 의 --grade-* 를 쓴다.
PREVIEW_COLORS = {
    "PREMIUM": "#2F86D6", "EXCITING": "#D9A32B", "TABLE": "#7B4BD1", "BLUE": "#1F6FD0",
    "ORANGE": "#E07B33", "RED": "#C23B4A", "NAVY": "#28356B", "OUTFIELD": "#2F8A57",
    "CHEER": "#E0457B", "SKY": "#4FA3C7", "GRASS": "#6BAA3C", "PARTY": "#B5651D",
}


# ---------------------------------------------------------------- 프론트 TS

def ts_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def render_ts(layouts):
    out = ["/**",
           " * 구장별 좌석 배치도 좌표. scripts/generate-stadium-map.py 로 만든 파일이므로 직접 수정하지 않는다.",
           " * 구장은 stadiums.code 로, 블록은 seat_sections.zone_code 로 DB와 이어진다.",
           " */", "",
           "export type StadiumBlock = {",
           "  /** DB seat_sections.zoneCode 와 같은 값 (구장 안에서만 겹치지 않는다) */",
           "  code: string", "  grade: string", "  number: number",
           "  /** SVG path 데이터 */", "  d: string",
           "  labelX: number", "  labelY: number", "  labelRotate: number", "}", "",
           "export type StadiumShape = { d: string; fill: string }", "",
           "export type StadiumLayout = {",
           "  code: string", "  name: string",
           "  /** 구장 바깥 모양 (흰 바탕) */", "  outline: string",
           "  /** 바깥 모양 위, 그라운드 아래에 까는 장식 (돔 지붕 등) */", "  decor: StadiumShape[]",
           "  /** 그라운드 배경. 클릭 대상이 아니다. */", "  fieldShapes: StadiumShape[]",
           "  fieldLines: string[]",
           "  fieldMarks: { cx: number; cy: number; r: number; fill: string }[]",
           "  /** 그라운드 위에 또렷하게 그리는 구조물 (높은 담장 등) */", "  walls: StadiumShape[]",
           "  /** 3루·1루 표시와 구장 특징(몬스터월 등) 글자 */",
           "  labels: { x: number; y: number; text: string }[]",
           "  blocks: StadiumBlock[]", "}", "",
           f"export const STADIUM_VIEW_BOX = '0 0 {W} {H}'", "",
           "export const STADIUM_LAYOUTS: Record<string, StadiumLayout> = {"]
    for stadium, blocks in layouts:
        shapes, lines, marks, bases = field(stadium)
        out.append(f"  {stadium['code']}: {{")
        out.append(f"    code: {ts_str(stadium['code'])},")
        out.append(f"    name: {ts_str(stadium['name'])},")
        out.append(f"    outline: {ts_str(stadium['outline'])},")
        out.append("    decor: [")
        out += [f"      {{ d: {ts_str(s['d'])}, fill: {ts_str(s['fill'])} }}," for s in stadium.get("decor", [])]
        out.append("    ],")
        out.append("    fieldShapes: [")
        out += [f"      {{ d: {ts_str(d)}, fill: {ts_str(fill)} }}," for d, fill in shapes]
        out.append("    ],")
        out.append("    fieldLines: [")
        out += [f"      {ts_str(d)}," for d in lines]
        out.append("    ],")
        out.append("    fieldMarks: [")
        out += [f"      {{ cx: {cx:.1f}, cy: {cy:.1f}, r: {r}, fill: {ts_str(fill)} }}," for cx, cy, r, fill in marks]
        out.append("    ],")
        out.append("    walls: [")
        out += [f"      {{ d: {ts_str(s['d'])}, fill: {ts_str(s['fill'])} }}," for s in stadium.get("walls", [])]
        out.append("    ],")
        out.append("    labels: [")
        out += [f"      {{ x: {x:.1f}, y: {y:.1f}, text: {ts_str(t)} }},"
                for x, y, t in bases + stadium.get("landmarks", [])]
        out.append("    ],")
        out.append("    blocks: [")
        for b in blocks:
            x, y = b["label_pos"]
            out.append(f"      {{ code: '{b['code']}', grade: '{b['grade']}', number: {b['num']}, "
                       f"labelX: {x:.1f}, labelY: {y:.1f}, labelRotate: {b['rotate']:.0f},")
            out.append(f"        d: '{b['d']}' }},")
        out.append("    ],")
        out.append("  },")
    out += ["}", ""]
    return NL.join(out)


# ---------------------------------------------------------------- 마이그레이션 SQL

def sql_str(s):
    return "'" + s.replace("'", "''") + "'"


def render_sql(layouts):
    lines = [
        "-- 구장별 좌석 배치도. 생성기(scripts/generate-stadium-map.py)가 만든 SQL이다. 직접 고치지 말고 다시 생성할 것.",
        "-- 구장마다 code를 붙이고(배치도 frontend/src/lib/stadiumMaps.ts 와 이어진다),",
        "-- 잠실을 뺀 8개 구장은 공통 블록을 숨기고 구장별 블록을 새로 넣는다.",
        "-- 숨긴 블록은 예매 이력이 걸려 있어 지우지 않는다. (기존 예매는 그대로 유효하다)",
        "-- 구역은 경기 상세 캐시에 들어가므로, 배포 뒤 Redis의 ticketing:cache:* 를 비워야 바로 반영된다.",
        "",
        "ALTER TABLE stadiums ADD COLUMN code VARCHAR(20);",
        "",
    ]
    for stadium, _ in layouts:
        lines.append(f"UPDATE stadiums SET code = '{stadium['code']}' WHERE name = {sql_str(stadium['name'])};")
    lines += ["", "CREATE UNIQUE INDEX uk_stadiums_code ON stadiums (code);", ""]
    for stadium, blocks in layouts:
        if stadium.get("existing"):
            continue
        lines.append(f"-- {stadium['name']}: 블록 {len(blocks)}개, 좌석 {sum(b['seats'] for b in blocks):,}석")
        lines.append("UPDATE seat_sections SET active = FALSE "
                     f"WHERE active = TRUE AND stadium_id = (SELECT id FROM stadiums WHERE code = '{stadium['code']}');")
        for order, b in enumerate(blocks, start=1):
            lines.append(
                "INSERT INTO seat_sections "
                "(stadium_id, zone_code, name, grade, price, seat_rows, seats_per_row, display_order, active)" + NL +
                f"SELECT id, '{b['code']}', {sql_str(b['label'])}, '{b['grade']}', {b['price']}, "
                f"{b['rows']}, {b['seats_per_row']}, {order}, TRUE FROM stadiums WHERE code = '{stadium['code']}';")
        lines.append("")
    return NL.join(lines)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "out")
    os.makedirs(out_dir, exist_ok=True)
    layouts = [(s, build(s)) for s in STADIUMS]
    for stadium, blocks in layouts:
        path = os.path.join(out_dir, f"stadium-{stadium['code']}.svg")
        open(path, "w", encoding="utf-8", newline=NL).write(render_svg(stadium, blocks))
    open(os.path.join(out_dir, "stadiumMaps.ts"), "w", encoding="utf-8", newline=NL).write(render_ts(layouts))
    open(os.path.join(out_dir, "stadium-blocks.sql"), "w", encoding="utf-8", newline=NL).write(render_sql(layouts))
    for stadium, blocks in layouts:
        total = sum(b["seats"] for b in blocks)
        grades = {}
        for b in blocks:
            grades.setdefault(b["name"], []).append(b)
        summary = ", ".join(f"{n} {len(bs)}" for n, bs in grades.items())
        print(f"{stadium['code']:<9} 블록 {len(blocks):>2}개 · 좌석 {total:>6,}석 · {summary}")
