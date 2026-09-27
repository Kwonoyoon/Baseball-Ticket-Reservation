import type { Member } from './types'

const AUTH_STORAGE_KEY = 'ballpark.auth'

/** 인증된 요청이 401을 받으면 발생한다. AuthProvider가 받아서 로그아웃 처리한다. */
export const AUTH_EXPIRED_EVENT = 'ballpark:auth-expired'

export type StoredAuth = {
  accessToken: string
  /** epoch milliseconds */
  expiresAt: number
  member: Member
}

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

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const auth = JSON.parse(raw) as StoredAuth
    if (!auth.accessToken || auth.expiresAt <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return auth
  } catch {
    return null
  }
}

export function saveStoredAuth(auth: StoredAuth | null): void {
  try {
    if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 현재 탭의 메모리 상태만 유지한다.
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function errorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  return error instanceof ApiError ? error.message : fallback
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const auth = loadStoredAuth()
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (auth) headers.set('Authorization', `Bearer ${auth.accessToken}`)

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
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
