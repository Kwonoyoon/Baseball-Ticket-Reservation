import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startSession } from '../api/client'
import type { Notification } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, loginResult, restoreSessionAs, testMember } from '../test/session'
import { NotificationProvider } from './NotificationProvider'
import { useNotifications } from './useNotifications'

/** 테스트에서 서버 이벤트를 직접 흘려 넣을 수 있는 EventSource */
class ControlledEventSource {
  static readonly CLOSED = 2
  static instances: ControlledEventSource[] = []
  readonly url: string
  readyState = 0
  onerror: (() => void) | null = null
  private listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>()

  constructor(url: string) {
    this.url = url
    ControlledEventSource.instances.push(this)
  }

  addEventListener(name: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener])
  }

  close() {
    this.readyState = ControlledEventSource.CLOSED
  }

  emit(name: string, data = 'ok') {
    this.listeners.get(name)?.forEach((listener) => listener(new MessageEvent(name, { data })))
  }

  static latest() {
    return ControlledEventSource.instances[ControlledEventSource.instances.length - 1]
  }
}

function notification(id: number, title: string): Notification {
  return {
    id,
    type: 'RESERVATION_CONFIRMED',
    title,
    message: `${title} 내용`,
    read: false,
    createdAt: '2026-09-28T12:00:00',
  }
}

function Probe() {
  const { notifications, unreadCount } = useNotifications()
  return (
    <p>
      알림 {unreadCount}개: {notifications.map((n) => n.title).join(', ')}
    </p>
  )
}

/** 서버에 저장된 알림. 테스트 중에 바꿔서 "연결이 끊긴 사이 생긴 알림"을 흉내 낸다. */
let serverNotifications: Notification[] = []

function renderProvider() {
  restoreSessionAs(testMember(), (url) => {
    if (url === '/api/notifications') return jsonResponse(200, serverNotifications)
    if (url === '/api/notifications/unread-count') return jsonResponse(200, { count: serverNotifications.length })
    return undefined
  })
  render(
    <AuthProvider>
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    </AuthProvider>,
  )
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    ControlledEventSource.instances = []
    vi.stubGlobal('EventSource', ControlledEventSource)
    serverNotifications = [notification(1, '예매 완료')]
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('다시 연결되면 끊긴 사이에 생긴 알림까지 목록을 맞춘다', async () => {
    renderProvider()
    expect(await screen.findByText('알림 1개: 예매 완료')).toBeInTheDocument()

    // 연결이 끊긴 사이 서버에 알림이 하나 더 쌓였다. 스트림으로는 오지 않는다.
    serverNotifications = [notification(2, '예매 취소'), ...serverNotifications]
    act(() => ControlledEventSource.latest().emit('connected'))

    expect(await screen.findByText('알림 2개: 예매 취소, 예매 완료')).toBeInTheDocument()
  })

  it('스트림으로 온 알림은 바로 목록 맨 위에 붙는다', async () => {
    renderProvider()
    await screen.findByText('알림 1개: 예매 완료')

    act(() => ControlledEventSource.latest().emit('notification', JSON.stringify(notification(3, '새 알림'))))

    expect(screen.getByText('알림 2개: 새 알림, 예매 완료')).toBeInTheDocument()
  })

  it('토큰이 갱신되면 새 토큰으로 다시 연결하고 예전 연결은 닫는다', async () => {
    renderProvider()
    await screen.findByText('알림 1개: 예매 완료')
    const first = ControlledEventSource.latest()
    expect(first.url).toContain('token=access-token')

    act(() => startSession(loginResult(testMember(), 'renewed-token')))

    const second = ControlledEventSource.latest()
    expect(second).not.toBe(first)
    expect(second.url).toContain('token=renewed-token')
    expect(first.readyState).toBe(ControlledEventSource.CLOSED)
  })
})
