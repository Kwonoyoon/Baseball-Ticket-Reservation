/**
 * 커뮤니티 구단 게시판에 들어올 때 연출.
 * 띠가 오른쪽에서 왼쪽으로 펼쳐지고(앞쪽 끝에 야구공), 같은 속도로 배경이 구단 색으로 칠해진 뒤, 글이 하나씩 올라온다.
 * 띠·야구공·배경이 같은 시간과 가속 곡선(CSS의 --intro-ease)으로 움직여야 끝이 맞는다.
 */
export const COMMUNITY_INTRO_MS = 1100

/** 움직임 줄이기 설정이면 연출 없이 바로 보여 준다. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
