# 협업 가이드

6명이 함께 쓰는 저장소입니다. `main`은 모두가 pull 받는 공용 코드이므로 **항상 실행 가능한 상태**로 유지합니다.

> GitHub 무료 플랜의 private 저장소라 브랜치 보호 규칙이 적용되지 않습니다.
> 아래 규칙은 **팀 약속**으로 지키고, 실수 방지를 위해 pre-push hook을 사용합니다.

## 팀 규칙

1. **`main` 직접 push 금지**: 항상 브랜치에서 작업합니다.
2. **PR로만 합치기**: 작성자가 아닌 **팀원 1명의 승인**을 받은 뒤 Merge 합니다.
3. **작업 시작 전 `git pull`**: 최신 `main`에서 브랜치를 만듭니다.
4. **리뷰는 24시간 안에**: PR을 만들면 리뷰어를 지정하고, 지정된 사람은 하루 안에 확인합니다.
5. **`git push --force` 금지**: 다른 사람의 커밋이 사라질 수 있습니다.
6. **비밀 값 커밋 금지**: `.env`, 비밀번호, 토큰은 절대 올리지 않습니다.
7. **실수로 `main`에 push했다면**: 숨기지 말고 팀 채팅에 바로 알립니다. ([아래 참고](#실수로-main에-push-했을-때))

## 처음 한 번 설정

```bash
git clone https://github.com/Kwonoyoon/Baseball-Ticket-Reservation.git
cd Baseball-Ticket-Reservation

# 커밋 작성자 정보 (GitHub 계정 이메일)
git config user.name "내이름"
git config user.email "github-email@example.com"

# main 직접 push를 막는 hook 사용 (필수)
git config core.hooksPath .githooks

# 환경 변수 파일 만들기 (git에 올라가지 않습니다)
cp .env.example .env
```

## 매일 작업 순서

```bash
git switch main
git pull                                # 1. 최신 main 받기

git switch -c feature/좌석-선택-개선     # 2. 작업 브랜치 만들기

# 3. 코드 수정 후
git status
git add .
git commit -m "좌석 선택 최대 개수 안내 문구 추가"

git push -u origin feature/좌석-선택-개선  # 4. 내 브랜치에 올리기 (두 번째부터는 git push)
```

5. GitHub에서 **Compare & pull request** → 리뷰어 1명 지정 → PR 생성
6. 리뷰어가 **Approve** → **Squash and merge**
7. 다음 작업은 다시 1번부터

## 브랜치 이름

| 종류 | 형식 | 예시 |
| --- | --- | --- |
| 기능 추가 | `feature/기능명` | `feature/관리자-경기-등록` |
| 버그 수정 | `fix/버그명` | `fix/선점-시간-표시` |
| 문서 | `docs/내용` | `docs/api-명세` |
| 설정/리팩터링 | `chore/내용` | `chore/의존성-업데이트` |

## 커밋 메시지

- 무엇을 했는지 한 줄로 알 수 있게 씁니다. 예: `예매 취소 시 좌석 현황 갱신`
- 한 커밋에는 한 가지 변경만 담습니다.

## PR 규칙

- PR 템플릿의 **무엇을 / 왜 / 어떻게 확인했는지**를 채웁니다.
- PR은 작게 나눕니다. 파일 수십 개를 한 번에 올리면 리뷰와 충돌 해결이 어렵습니다.
- 리뷰어는 코드를 실제로 읽고 승인합니다. 궁금한 점은 댓글로 남기고, 작성자는 댓글을 해결한 뒤 Merge 합니다.
- DB 스키마(Flyway), 보안(Spring Security/JWT), 배포 설정 변경은 담당자를 리뷰어로 추가합니다.

## 작업 중 main이 바뀌었을 때

```bash
git pull origin main
```

충돌(conflict)이 나면

1. `git status`로 충돌 파일 확인
2. 파일의 `<<<<<<<`, `=======`, `>>>>>>>` 구간을 정리하고 표시 줄 삭제
3. `git add .` → `git commit` → `git push`

잘 모르겠으면 그 코드를 작성한 팀원과 함께 해결합니다.

## 실수로 main에 push 했을 때

1. 팀 채팅에 바로 알립니다.
2. **force push로 지우지 않습니다.** 대신 되돌리는 커밋을 PR로 올립니다.

```bash
git switch main
git pull
git switch -c fix/revert-잘못된-push
git revert <커밋ID>          # git log --oneline 으로 커밋ID 확인
git push -u origin fix/revert-잘못된-push
```

3. PR을 만들어 승인 후 Merge 합니다.

## 자주 쓰는 명령

| 목적 | 명령 |
| --- | --- |
| 현재 상태 | `git status` |
| 커밋 기록 | `git log --oneline` |
| 브랜치 목록 | `git branch` |
| 브랜치 이동 | `git switch 브랜치명` |
| 수정 내용 보기 | `git diff` |
| 커밋 전 파일 수정 되돌리기 | `git restore 파일명` |
