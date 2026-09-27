import type { LoginResult, Member } from './types'

/**
 * 로그인 세션.
 * - 액세스 토큰(30분)은 이 모듈의 메모리에만 둔다. 스크립트가 읽을 수 있는 저장소(localStorage)에 두지 않는다.
 * - 리프레시 토큰은 서버가 HttpOnly 쿠키로 관리하므로 프론트엔드는 값을 알 수 없다.
 * - 새로고침·새 창에서는 /auth/refresh로 액세스 토큰을 다시 받는다.
 * - localStorage에는 "로그인했던 적이 있다"는 표시만 남겨, 로그인한 적 없는 방문자에게는 갱신 요청을 보내지 않는다.
 */
const SESSION_HINT_KEY = 'ballpark.session'
/** 갱신이 필요 없는 인증 API. (로그인 실패 등의 401을 토큰 만료로 오해하지 않도록) */
const NO_REFRESH_PATHS = new Set(['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'])
/** 여러 탭이 동시에 갱신해 늦은 쪽이 거절됐을 때, 먼저 성공한 탭이 받아 둔 새 쿠키로 한 번 더 시도하기까지의 대기 */
const REFRESH_RETRY_DELAY_MS = 300

let accessToken: string | null = null
let inFlightRefresh: Promise<boolean> | null = null
const sessionListeners = new Set<(member: Member | null) => void>()

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** 로그인한 회원이 바뀌면(로그인·갱신·로그아웃·세션 만료) 알려 준다. 해제 함수를 돌려준다. */
export function onSessionChange(listener: (member: Member | null) => void): () => void {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

export function startSession(result: LoginResult): void {
  accessToken = result.accessToken
  writeSessionHint(true)
  sessionListeners.forEach((listener) => listener(result.member))
}

export function endSession(): void {
  accessToken = null
  writeSessionHint(false)
  sessionListeners.forEach((listener) => listener(null))
}

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function writeSessionHint(value: boolean): void {
  try {
    if (value) localStorage.setItem(SESSION_HINT_KEY, '1')
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // 저장소를 쓸 수 없으면 새로고침 때 세션을 복원하지 못할 뿐이다.
  }
}

/**
 * 리프레시 토큰 쿠키로 새 액세스 토큰을 받는다. 동시에 여러 요청이 401을 받아도 갱신 요청은 한 번만 보낸다.
 *
 * @returns 성공 여부. 실패하면 세션을 끝낸다.
 */
export function refreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    const hadSession = accessToken !== null
    inFlightRefresh = (async () => {
      let response = await postRefresh()
      if (response?.status === 401 && hadSession) {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS))
        response = await postRefresh()
      }
      if (!response?.ok) {
        endSession()
        return false
      }
      startSession((await response.json()) as LoginResult)
      return true
    })().finally(() => {
      inFlightRefresh = null
    })
  }
  return inFlightRefresh
}

async function postRefresh(): Promise<Response | null> {
  try {
    return await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    return null
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function errorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  return error instanceof ApiError ? error.message : fallback
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * API 요청. 로그인 상태에서 401을 받으면 액세스 토큰을 한 번 갱신하고 다시 보낸다.
 * 갱신도 실패하면 세션을 끝내고(로그아웃 화면으로 바뀜) 원래 오류를 던진다.
 */
export async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const send = async (token: string | null) => {
    const headers = new Headers({ Accept: 'application/json' })
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    try {
      return await fetch(`/api${path}`, {
        method,
        headers,
        signal,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const sentToken = accessToken
  let response = await send(sentToken)
  if (response.status === 401 && sentToken && !NO_REFRESH_PATHS.has(path)) {
    // 다른 요청이 이미 갱신했으면 새 토큰으로 바로 다시 보낸다.
    if (accessToken !== sentToken || (await refreshSession())) {
      response = await send(accessToken)
    }
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
    throw new ApiError(
      response.status,
      data?.code ?? 'UNKNOWN_ERROR',
      data?.message ?? '요청을 처리하지 못했습니다.',
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
