/**
 * 커뮤니티 구단 게시판에 들어올 때 연출. 차례대로:
 *   1) 띠가 오른쪽에서 왼쪽으로 펼쳐진다. 펼쳐지는 앞쪽 끝을 야구공이 굴러간다.
 *   2) 띠가 다 나오면 배경이 오른쪽에서 왼쪽으로 구단 색으로 칠해진다.
 *   3) 이어서 글이 하나씩 올라온다.
 * 띠와 야구공은 같은 시간·가속 곡선(CSS의 --intro-ease)으로 움직여야 공이 띠 끝에 붙어 간다.
 */
export const BANNER_REVEAL_MS = 1800
export const BACKGROUND_WASH_MS = 900
/** 연출 전체 시간. 글은 이 뒤에 올라온다. */
export const COMMUNITY_INTRO_MS = BANNER_REVEAL_MS + BACKGROUND_WASH_MS

/** 움직임 줄이기 설정이면 연출 없이 바로 보여 준다. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
