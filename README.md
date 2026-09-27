# Baseball-Ticket-Reservation

**볼파크 티켓 ⚾** — KBO 경기 일정 조회부터 좌석 선택, 결제, 예매 취소까지 이어지는 야구 티켓 예매 사이트입니다.

> 👥 6명이 함께 진행하는 팀 프로젝트입니다. 작업 전에 반드시 [협업 가이드(CONTRIBUTING.md)](CONTRIBUTING.md)를 읽어 주세요.
> `main`에는 직접 push하지 않고, 브랜치 → Pull Request → 팀원 1명 승인 → Merge 순서로 합칩니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Backend | Spring Boot 4, Spring Data JPA, Spring Security, JWT(jjwt), Spring Cache, Flyway, Gradle |
| Frontend | React 19, React Router, Vite, Vitest, TypeScript |
| Database | MySQL 8.4, Redis 7.4 (좌석 선점 · 캐시) |
| 배포 | Docker, Docker Compose, Nginx |

## 주요 기능

- 날짜/구단별 경기 일정 조회 (Spring Cache로 캐시)
- **좌석 배치도**: 9개 구장 모두 등급별 8색 · 53개 블록을 클릭해 원하는 구역만 예매
- 구역 선택 → 좌석 배치도에서 좌석 선택 (**매수를 고르면 커서 위치 기준 연석 자동 선택**)
- **1인 예매 제한**: 한 경기에서 한 회원은 최대 4석까지 (취소하면 한도 복구)
- **Redis 좌석 선점**: 결제 전 5분간 좌석을 선점하고, 다른 고객에게는 "선택 중"으로 표시
- 가상 결제로 예매 확정, 예매 내역 조회 및 경기 시작 전 취소
- 아이디 기반 회원가입/로그인, 자동 로그인, 마이페이지(비밀번호 변경·회원 탈퇴)
- 관리자 회원 관리: 회원 검색, 잠금/해제, 권한 변경

## 회원 종류와 로그인

| 종류 | 할 수 있는 것 |
| --- | --- |
| 비회원 (로그인 전) | 경기 일정, 좌석 현황 조회 |
| 회원 `MEMBER` | 좌석 선점·예매·취소, 예매 내역, 마이페이지 |
| 관리자 `ADMIN` | 회원 기능 + 회원 관리 (`/admin/members`, `/api/admin/**`) |

- **토큰**: 액세스 토큰(JWT, 30분)은 응답 본문으로 받아 프론트엔드 메모리에만 둡니다. 리프레시 토큰(7일)은 `HttpOnly` · `SameSite=Strict` 쿠키(`Path=/api/auth`)로만 오가며, DB에는 SHA-256 해시만 저장합니다.
- **자동 로그인**: 체크하면 쿠키를 7일 유지하고, 아니면 브라우저를 닫을 때 사라지는 세션 쿠키입니다.
- **토큰 교체**: 갱신할 때마다 리프레시 토큰을 새로 발급합니다. 이미 교체된 토큰이 다시 쓰이면(탈취 의심) 그 로그인 전체를 끊습니다. 여러 탭이 동시에 갱신하는 경우를 위해 10초의 유예가 있습니다.
- **계정 상태는 요청마다 확인**: 잠금·탈퇴·권한 변경은 다음 요청부터 바로 반영됩니다. 비밀번호를 바꾸면 다른 기기의 로그인은 모두 끊기고 지금 기기만 유지됩니다.
- **계정 잠금**: 비밀번호를 5회 연속 틀리면 잠기고, 관리자가 풀어야 합니다. 없는 아이디와 틀린 비밀번호는 같은 오류로 응답합니다.
- **첫 관리자**: 서버 시작 시 `ADMIN_USERNAME`/`ADMIN_PASSWORD`가 있고 같은 아이디가 없으면 만듭니다. `local` 프로필은 `application-local.yml`에 로컬 전용 값이 들어 있습니다. 이후 관리자는 회원 관리 화면에서 권한을 바꿔 추가합니다.
- **탈퇴**: 관람 예정인 예매가 없어야 하며, 예매 이력은 남기고 이름·이메일만 지웁니다. 아이디는 다시 쓸 수 없고, 관리자는 탈퇴할 수 없습니다.

## 좌석 중복 판매 방지 설계

```
[좌석 선택] ──POST /holds──▶ Redis Lua 스크립트 (SET PX, 여러 좌석 원자적 처리)
                               └ 하나라도 다른 회원이 선점 중이면 전체 실패 (409)
[결제하기]  ──POST /reservations──▶ ① Redis에서 본인 선점 확인
                                     ② reservations + sold_seats INSERT & flush
                                        └ UNIQUE(game_id, section_id, row_no, seat_no)가 최종 방어선
                                     ③ 좌석 확보 후에만 결제 요청
                                     ④ 커밋 후 선점 해제 (실패해도 TTL로 자동 만료)
```

- **Redis**: 사용자 경험을 위한 1차 잠금. 좌석 키에 해시 태그(`{game:ID}`)를 붙여 Redis Cluster에서도 스크립트가 동작합니다.
- **MySQL 유니크 제약**: Redis 장애나 TTL 만료 경합이 있어도 같은 좌석이 두 번 팔리지 않도록 보장합니다.
- 예매를 취소하면 `sold_seats` 행만 삭제되고 `reservation_seats`는 이력으로 남습니다.

## 프로젝트 구조

```
backend/    Spring Boot API (도메인별 패키지: member, game, seat, reservation ...)
frontend/   React SPA
nginx/      프론트엔드 빌드 + 리버스 프록시 이미지
scripts/    좌석 배치도 생성기
docker-compose.yml
```

### 좌석 배치도

배치도는 좌표를 직접 계산해 그린 것으로, 아래 생성기로 만듭니다. (외부 배치도를 복사하지 않았습니다)
블록 구조는 **9개 구장이 모두 같습니다.**

```bash
cd scripts && python generate-stadium-map.py
```

생성물은 `scripts/out/`에 만들어지고, `zone_code`로 서로 연결됩니다.

- `stadiumBlocks.ts` → `frontend/src/lib/stadiumBlocks.ts` (직접 수정하지 말고 생성기를 고칠 것)
- `stadium-blocks.sql` → 새 Flyway 마이그레이션 (이미 적용된 마이그레이션은 고치지 않습니다)
- `stadium-map.svg` — 눈으로 확인할 때 쓰는 미리보기

## 실행 방법

### 1. 빠르게 실행해 보기 (MySQL/Redis 없이)

`local` 프로필은 H2(MySQL 호환 모드)와 메모리 좌석 선점 저장소를 사용합니다.

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 에 접속합니다. Vite 개발 서버가 `/api` 요청을 `localhost:8080`으로 프록시합니다.

> 8080 포트를 쓸 수 없다면 백엔드를 `--server.port=18080` 등으로 실행하고,
> `frontend/.env.development.local`에 `API_PROXY_TARGET=http://localhost:18080`을 적어 주세요.

### 2. MySQL + Redis로 개발하기

```bash
cp .env.example .env
docker compose up -d mysql redis
```

백엔드는 기본 프로필로 실행하되 `.env`와 같은 DB 비밀번호를 환경 변수로 넘깁니다.
Docker의 MySQL은 PC에 설치된 MySQL과 겹치지 않도록 호스트 포트 **3307**로 열려 있습니다.

```bash
cd backend
DB_PORT=3307 DB_PASSWORD=change-me-db-password ./gradlew bootRun
```

### 3. Docker Compose로 전체 배포

```bash
cp .env.example .env   # 비밀번호, JWT_SECRET, ADMIN_PASSWORD를 반드시 변경
docker compose up -d --build
```

http://localhost 로 접속합니다. (Nginx → 정적 파일 / `/api` → Spring Boot)

## 테스트

```bash
cd backend && ./gradlew test      # JWT, 좌석 선점 저장소, 예매 전체 흐름 통합 테스트
cd frontend && npm run test:run   # 포맷 유틸, 좌석 배치도, 로그인 페이지
```

## API 요약

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | | 회원가입 |
| POST | `/api/auth/login` | | 로그인 (액세스 토큰 + 리프레시 쿠키) |
| POST | `/api/auth/refresh` | 쿠키 | 액세스 토큰 갱신 (리프레시 토큰 교체) |
| POST | `/api/auth/logout` | 쿠키 | 로그아웃 (이 브라우저의 로그인 폐기) |
| PUT | `/api/auth/password` | ✅ | 비밀번호 변경 (다른 기기 로그아웃) |
| GET | `/api/members/me` | ✅ | 내 정보 |
| POST | `/api/members/me/withdraw` | ✅ | 회원 탈퇴 |
| GET | `/api/admin/members?keyword=` | 관리자 | 회원 목록·검색 |
| POST | `/api/admin/members/{id}/lock`, `/unlock` | 관리자 | 계정 잠금/해제 |
| PUT | `/api/admin/members/{id}/role` | 관리자 | 권한 변경 (`MEMBER`/`ADMIN`) |
| GET | `/api/teams` | | 구단 목록 |
| GET | `/api/games?date=YYYY-MM-DD&teamId=` | | 경기 일정 |
| GET | `/api/games/{gameId}` | | 경기 상세 + 좌석 구역 |
| GET | `/api/games/{gameId}/seats?sectionId=` | 선택 | 한 구역의 실시간 좌석 현황 (판매/선점/내 선점) |
| GET | `/api/games/{gameId}/seats/summary` | 선택 | 구역별 잔여석 요약 (구장 화면용, 좌석 목록 없음) |
| POST | `/api/games/{gameId}/holds` | ✅ | 좌석 선점 |
| DELETE | `/api/games/{gameId}/holds` | ✅ | 내 선점 해제 |
| POST | `/api/reservations` | ✅ | 예매(결제) |
| GET | `/api/reservations/me` | ✅ | 내 예매 내역 |
| GET | `/api/reservations/{id}` | ✅ | 예매 상세 |
| POST | `/api/reservations/{id}/cancel` | ✅ | 예매 취소 |

오류 응답 형식: `{ "code": "SEAT_ALREADY_HELD", "message": "다른 고객이 선택 중인 좌석입니다." }`

## 참고

- 결제는 `FakePaymentGateway`가 항상 승인하는 가상 결제입니다. 실제 PG 연동 시 `PaymentGateway` 구현만 교체하면 됩니다.
- 샘플 경기는 서버 시작 시 오늘부터 14일치(월요일 제외)가 자동 생성됩니다. `SAMPLE_DATA_ENABLED=false`로 끌 수 있습니다.
- 구단명과 구장명은 학습용 샘플 데이터입니다.
