export const CALENDAR_PATH = '/my/calendar'

/**
 * 직관 캘린더를 새 창(팝업)으로 연다.
 * 로그인 정보가 localStorage에 있어서 같은 출처의 새 창과 그대로 공유된다.
 * 창 이름을 고정해 두면 이미 열려 있을 때 새 창을 또 만들지 않고 그 창을 다시 쓴다.
 */
export function openCalendarWindow(): void {
  window.open(CALENDAR_PATH, 'safeticket-calendar', 'popup,width=520,height=720')
}
