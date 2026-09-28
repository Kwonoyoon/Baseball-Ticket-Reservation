import { vi } from 'vitest'
import type { LoginResult, Member, MemberRole } from '../api/types'

export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function testMember(role: MemberRole = 'MEMBER', overrides: Partial<Member> = {}): Member {
  return { id: 1, username: 'fan01', email: 'fan@ballpark.com', name: '야구팬', role, favoriteTeamId: null, ...overrides }
}

export function loginResult(member: Member, accessToken = 'access-token'): LoginResult {
  return { accessToken, tokenType: 'Bearer', expiresIn: 1800, member }
}

/**
 * 이전에 로그인했던 브라우저처럼 만든다. AuthProvider가 처음 그려질 때 /api/auth/refresh로 세션을 복원한다.
 * 나머지 요청은 handler로 넘긴다. 돌려준 fetch mock으로 호출을 검사할 수 있다.
 */
export function restoreSessionAs(member: Member, handler: (url: string, init?: RequestInit) => Response | undefined = () => undefined) {
  localStorage.setItem('ballpark.session', '1')
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/auth/refresh') return jsonResponse(200, loginResult(member))
    if (url === '/api/auth/logout') return new Response(null, { status: 204 })
    return handler(url, init) ?? jsonResponse(404, { code: 'NOT_FOUND', message: '없음' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
