import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { endSession } from '../api/client'

// jsdom에는 EventSource가 없다. 알림 스트림은 연결만 시도하고 아무 일도 하지 않는 가짜로 대신한다.
if (typeof globalThis.EventSource === 'undefined') {
  class FakeEventSource {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSED = 2
    readyState = FakeEventSource.CONNECTING
    onerror: ((event: Event) => void) | null = null
    readonly url: string
    constructor(url: string) {
      this.url = url
    }
    addEventListener() {}
    close() {
      this.readyState = FakeEventSource.CLOSED
    }
  }
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource
}

afterEach(() => {
  cleanup()
  // 액세스 토큰은 모듈 메모리에 있으므로 테스트끼리 섞이지 않게 비운다.
  endSession()
  localStorage.clear()
})
