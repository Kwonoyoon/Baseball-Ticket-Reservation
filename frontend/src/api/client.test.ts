import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, loginResult, testMember } from '../test/session'
import { ApiError, onSessionChange, request, startSession } from './client'

const member = testMember()

function authHeader(call: unknown[]): string | null {
  return new Headers((call[1] as RequestInit).headers).get('Authorization')
}

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('로그인 중이면 액세스 토큰을 Bearer로 보낸다', async () => {
    startSession(loginResult(member, 'token-1'))
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await request('/reservations/me')

    expect(authHeader(fetchMock.mock.calls[0])).toBe('Bearer token-1')
  })

  it('401을 받으면 토큰을 한 번 갱신하고 새 토큰으로 다시 보낸다', async () => {
    startSession(loginResult(member, 'expired'))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }))
      .mockResolvedValueOnce(jsonResponse(200, loginResult(member, 'fresh')))
      .mockResolvedValueOnce(jsonResponse(200, ['ok']))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/reservations/me')).resolves.toEqual(['ok'])

    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh')
    expect(authHeader(fetchMock.mock.calls[2])).toBe('Bearer fresh')
  })

  it('동시에 여러 요청이 401을 받아도 갱신은 한 번만 한다', async () => {
    startSession(loginResult(member, 'expired'))
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/auth/refresh') return jsonResponse(200, loginResult(member, 'fresh'))
      const token = new Headers(init?.headers).get('Authorization')
      return token === 'Bearer fresh' ? jsonResponse(200, 'ok') : jsonResponse(401, { code: 'UNAUTHORIZED' })
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([request('/a'), request('/b'), request('/c')])

    expect(fetchMock.mock.calls.filter((call) => call[0] === '/api/auth/refresh')).toHaveLength(1)
  })

  it('갱신도 실패하면 세션을 끝내고 원래 오류를 던진다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    startSession(loginResult(member, 'expired'))
    const sessions: unknown[] = []
    const unsubscribe = onSessionChange((next) => sessions.push(next))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input) === '/api/auth/refresh'
          ? jsonResponse(401, { code: 'INVALID_REFRESH_TOKEN' })
          : jsonResponse(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }),
      ),
    )

    await expect(request('/reservations/me')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })

    expect(sessions).toEqual([null])
    expect(localStorage.getItem('ballpark.session')).toBeNull()
    unsubscribe()
    vi.useRealTimers()
  })

  it('다른 탭이 먼저 갱신해 거절되면 새 쿠키로 한 번 더 갱신한다', async () => {
    startSession(loginResult(member, 'expired'))
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/auth/refresh') {
          refreshCalls += 1
          return refreshCalls === 1
            ? jsonResponse(401, { code: 'INVALID_REFRESH_TOKEN' })
            : jsonResponse(200, loginResult(member, 'fresh'))
        }
        const token = new Headers(init?.headers).get('Authorization')
        return token === 'Bearer fresh' ? jsonResponse(200, 'ok') : jsonResponse(401, { code: 'UNAUTHORIZED' })
      }),
    )

    await expect(request('/reservations/me')).resolves.toBe('ok')
    expect(refreshCalls).toBe(2)
  })

  it('로그인 실패의 401은 토큰 만료로 보지 않는다', async () => {
    startSession(loginResult(member))
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: '아이디 또는 비밀번호가 올바르지 않습니다.' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('비회원 요청의 401은 갱신하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/reservations/me')).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
