# 알림이 막은 결제

**상태**: 해결 (알림 시스템 통합 PR에서 적용)
**스택**: Spring Boot, JPA, MySQL, Redis

예매 확정 트랜잭션에 알림 저장 로직이 함께 묶이면서, 결제가 정상적으로 승인된 뒤에도 화면에는 500 에러가 노출된 사고를 추적한 기록.

## TL;DR

- 예매 확정 메서드 `ReservationService.reserve()` 안에서, 결제 승인 직후 알림 생성(`notificationService.create()`)을 **같은 트랜잭션**으로 호출하고 있었다.
- 알림 저장 쪽에서 예외가 나면 — 신규 알림 테이블이 아직 반영 안 됐거나, 그 밖의 어떤 이유로든 — 이미 PG사 승인까지 끝난 예매 전체가 롤백되고, 사용자에게는 원인을 알 수 없는 전역 500 메시지만 노출된다.

## 1. 증상

좌석 선점 타이머가 아직 살아있는 결제 화면에서, 결제 버튼을 누른 직후 다음 메시지를 받았다.

```
총 결제 금액                          20,000원
일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
좌석 선점 남은 시간                     04:40

결제 수단
○ 신용/체크카드
```

타이머가 여전히 돌고 있다는 것 자체가 단서였다 — 결제 요청이 서버까지 갔다가 **실패로 롤백**됐다는 뜻이고, 이 문구는 특정 비즈니스 에러 메시지가 아니라 어디서나 뜰 수 있는 **전역 fallback 문구**처럼 보였다.

## 2. 진단 타임라인

1. **에러 문구로 코드베이스 검색** — "일시적인 오류가 발생했습니다"를 그대로 grep. `ErrorCode.java`의 `INTERNAL_ERROR` 단 한 곳에서만 매칭됐다 — 특정 상황을 위한 메시지가 아니라, 잡히지 않은 예외를 위한 500 fallback이라는 뜻.
2. **전역 예외 핸들러 확인** — `GlobalExceptionHandler`의 `Exception.class` 핸들러가 의도되지 않은 모든 예외를 `INTERNAL_ERROR`로 뭉개고 있음을 확인. 즉 결제 로직 어딘가에서 `BusinessException`이 아닌, 예상 못한 예외가 났다는 뜻이 된다.
3. **작업 중인 변경 이력 대조** — 아직 커밋 전인 `git diff`를 보니, 예매 확정 메서드 안에 알림 생성 호출이 새로 추가되어 있었다. 결제 승인 바로 다음 줄.
4. **알림 모듈 점검** — `NotificationService.create()`가 `notifications` / `notification_preferences` 테이블을 사용하는데, 이 테이블을 만드는 Flyway 마이그레이션(V8, V9)도 같은 작업에서 아직 커밋되지 않은 신규 파일이었다. 개발 DB에 반영이 안 됐거나 실패했다면 저장/조회 시점에 SQL 예외가 그대로 튄다.
5. **구조적 결론** — 테이블 반영 여부와 별개로, 결제 확정과 알림 저장이 하나의 `@Transactional` 메서드에 묶여 있다는 것 자체가 설계상 문제였다. 알림 쪽에서 어떤 이유로든 예외가 나면, 이미 PG 승인까지 받은 예매가 통째로 롤백된다.

## 3. 근본 원인

결제 확정 로직인 `ReservationService.reserve()`는 통째로 `@Transactional`이다. 결제가 승인되면 예약을 확정하고, 바로 다음 줄에서 알림을 생성한다.

```java
// ReservationService.java:115-121
reservation.confirm(payment.transactionId());

notificationService.create(memberId, NotificationType.RESERVATION_CONFIRMED, "예매가 완료되었습니다",
        reservation.getReservationNumber() + " 예매가 정상적으로 완료되었습니다.");
releaseHoldsAfterCommit(game.getId(), memberId, seats.keySet());
return ReservationResponse.from(reservation, now);
```

알림 저장 자체도 예외에 열려 있다 — 알림 환경설정 조회, insert, SSE 브로드캐스트까지 전부 같은 흐름 안에서 실행된다.

```java
// NotificationService.java:41-49
@Transactional
public void create(Long memberId, NotificationType type, String title, String message) {
    if (!isEnabled(memberId, type)) {
        return;
    }
    LocalDateTime now = LocalDateTime.now(clock);
    Notification notification = notificationRepository.save(new Notification(memberId, type, title, message, now));
    emitterRegistry.send(memberId, NotificationResponse.from(notification));
}
```

여기서 예외가 나면 `reserve()` 전체가 롤백되고, 상위 어디에도 이를 처리하는 `try/catch`가 없다 — 그대로 `GlobalExceptionHandler`의 catch-all까지 올라간다.

```java
// GlobalExceptionHandler.java:57-60
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
    log.error("처리되지 않은 예외가 발생했습니다.", e);
    return error(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getMessage());
}
```

### 왜 이렇게 짜여졌나

의도적인 설계 결정은 아니었던 것으로 보인다. "예매가 확정되면 알림을 보낸다"는 요구사항을 구현할 때 가장 직관적인 위치가 `reservation.confirm(...)` 바로 다음 줄이었고, `reserve()` 메서드 전체가 이미 `@Transactional`이었기 때문에 그 안에 호출을 추가하는 순간 자동으로 같은 트랜잭션에 편입됐다. 별도로 커밋 시점을 고려하지 않는 한 이게 Spring의 기본 동작이라, "알림 기능 추가" 자체에 집중하다 결제와의 결합이라는 부수 효과를 놓친 전형적인 케이스에 가깝다.

## 4. 해결 방향 (적용함 — 7절 참고)

같은 파일 안에 이미 정확히 같은 문제를 풀어둔 선례가 있다 — 좌석 선점 해제도 원래는 결제와 무관한 부가 작업이라, **트랜잭션 커밋 후에만** 실행되도록 분리되어 있다.

```java
// ReservationService.java:153-165 (기존 선례)
private void releaseHoldsAfterCommit(long gameId, long memberId, Set<SeatPosition> seats) {
    Set<SeatPosition> heldSeats = Set.copyOf(seats);
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
            try {
                seatHoldStore.release(gameId, memberId, heldSeats);
            } catch (RuntimeException e) {
                log.warn("좌석 선점 해제에 실패했습니다. 만료 시간이 지나면 자동 해제됩니다. gameId={}", gameId, e);
            }
        }
    });
}
```

알림 생성도 동일한 패턴을 적용하면 된다 — 커밋 이전이 아니라 **커밋 이후**에, 실패해도 로그만 남기고 삼키는 형태로.

| 지금 (트랜잭션 안) | 제안 (커밋 이후) |
| --- | --- |
| `reservation.confirm(...)`<br>`notificationService.create(...)`<br>`releaseHoldsAfterCommit(...)`<br>`return ...` | `reservation.confirm(...)`<br>`notifyAfterCommit(...)` *(try/catch + afterCommit())*<br>`releaseHoldsAfterCommit(...)`<br>`return ...` |

이렇게 분리하면: 예매(결제)는 알림 로직과 완전히 무관하게 커밋되고, 알림 저장이 실패해도 로그만 남을 뿐 결제는 정상 처리된다. 반대로 알림 성공 여부가 결제를 막는 일도 없어진다.

## 5. 관련 파일

| 파일 | 역할 |
| --- | --- |
| `backend/src/main/java/com/ballpark/ticketing/global/error/ErrorCode.java` | 전역 500 메시지 정의 |
| `backend/src/main/java/com/ballpark/ticketing/global/error/GlobalExceptionHandler.java` | catch-all 예외 핸들러 |
| `backend/src/main/java/com/ballpark/ticketing/reservation/ReservationService.java` | 결제 확정 트랜잭션 · `reserve()` / `cancel()` |
| `backend/src/main/java/com/ballpark/ticketing/notification/NotificationService.java` | 알림 생성 · 조회 · 설정 |
| `backend/src/main/resources/db/migration/V8__create_notifications.sql` | 신규 마이그레이션 · 미커밋 |
| `backend/src/main/resources/db/migration/V9__create_notification_preferences.sql` | 신규 마이그레이션 · 미커밋 |

## 6. 다음 단계

- [x] 에러 문구 → 전역 500 fallback으로 확인
- [x] 원인을 알림-결제 트랜잭션 결합으로 특정
- [x] 기존 `releaseHoldsAfterCommit` 패턴에서 해결 방향 확인
- [x] `notifyAfterCommit()` 적용
- [x] 마이그레이션 반영 — develop과 번호가 겹쳐 V10 / V11로 옮겨 반영
- [x] `cancel()`의 취소 알림도 같은 방식으로 분리

## 7. 적용 결과

제안대로 `ReservationService.notifyAfterCommit()`을 두고 예매·취소 알림을 커밋 뒤로 옮겼다. 적용하면서 두 가지를 더 챙겼다.

- **커밋 뒤에는 새 트랜잭션이 필요하다.** `afterCommit()` 시점에는 원래 트랜잭션이 끝났지만 자원이 아직 묶여 있어,
  기본 전파(`REQUIRED`)로 저장하면 이미 끝난 트랜잭션에 합류해 **알림이 저장되지 않는다.**
  `NotificationService.create()`를 `REQUIRES_NEW`로 바꿨다. (빼고 돌리면 `NotificationFlowIntegrationTest`가 실패하는 것으로 확인)
- **예매가 롤백되면 알림도 나가지 않는다.** 예전엔 커밋 전에 SSE로 보내서, 결제 뒤 롤백된 예매에도 알림이 갔다.

| 검증 | 결과 |
| --- | --- |
| 알림 저장이 실패해도 예매가 CONFIRMED로 남는가 | `알림에서_오류가_나도_결제된_예매는_취소되지_않는다` 통과 |
| 커밋 뒤 저장한 알림이 실제로 남는가 | `예매와_취소가_커밋되면_알림이_저장된다` 통과 |
