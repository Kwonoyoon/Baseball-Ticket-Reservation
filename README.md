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
- 구장 구역 선택 → 좌석 배치도에서 최대 4석 선택
- **Redis 좌석 선점**: 결제 전 5분간 좌석을 선점하고, 다른 고객에게는 "선택 중"으로 표시
- 가상 결제로 예매 확정, 예매 내역 조회 및 경기 시작 전 취소
- JWT 기반 회원가입/로그인

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
docker-compose.yml
```

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
cp .env.example .env   # 비밀번호와 JWT_SECRET을 반드시 변경
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
| POST | `/api/auth/login` | | 로그인 (JWT 발급) |
| GET | `/api/members/me` | ✅ | 내 정보 |
| GET | `/api/teams` | | 구단 목록 |
| GET | `/api/games?date=YYYY-MM-DD&teamId=` | | 경기 일정 |
| GET | `/api/games/{gameId}` | | 경기 상세 + 좌석 구역 |
| GET | `/api/games/{gameId}/seats` | 선택 | 실시간 좌석 현황 (판매/선점/내 선점) |
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
