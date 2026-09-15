/** 외부 주소로의 오픈 리다이렉트를 막기 위해 앱 내부 경로만 허용한다. */
export function safeRedirect(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
