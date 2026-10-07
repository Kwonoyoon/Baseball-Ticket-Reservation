import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LostProperty } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { LostPropertyPage } from './LostPropertyPage'

const item = (overrides: Partial<LostProperty>): LostProperty => ({
  id: 1,
  title: '검은 지갑',
  description: '1루 쪽에서 잃어버렸어요',
  stadiumName: '고척 스카이돔',
  specificLocation: '1루 블루석 12열',
  category: '지갑/신분증',
  imageUrl: null,
  storageLocation: null,
  status: 'REPORTED',
  lostOrFoundDate: '2026-10-05T18:30:00',
  createdAt: '2026-10-05T19:00:00',
  ...overrides,
})

function renderPage() {
  const router = createMemoryRouter([{ path: '/lost-properties', element: <LostPropertyPage /> }], {
    initialEntries: ['/lost-properties'],
  })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('LostPropertyPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('목록을 보여 주고, 구장·상태로 거르면 그 조건을 서버에 보낸다', async () => {
    const fetchMock = restoreSessionAs(testMember('MEMBER'), (url) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, ['고척 스카이돔', '사직 야구장'])
      if (url.startsWith('/api/lost-properties')) return jsonResponse(200, [item({})])
      return undefined
    })
    renderPage()

    expect(await screen.findByText('검은 지갑')).toBeInTheDocument()
    // 같은 글자가 상태 거르기 선택지에도 있어서, 목록 안에서만 찾는다.
    expect(within(screen.getByRole('list')).getByText('접수 완료')).toBeInTheDocument()
    expect(screen.getByText('고척 스카이돔 · 1루 블루석 12열')).toBeInTheDocument()

    const filter = screen.getByRole('group', { name: '분실물 거르기' })
    await userEvent.selectOptions(within(filter).getByLabelText('구장'), '사직 야구장')
    await userEvent.selectOptions(within(filter).getByLabelText('상태'), 'KEEPING')

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.some((url) => url.includes('stadiumName=') && url.includes('status=KEEPING'))).toBe(true)
    })
  })

  it('일반 회원에게는 상태를 바꾸는 칸이 없다', async () => {
    restoreSessionAs(testMember('MEMBER'), (url) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, [])
      if (url.startsWith('/api/lost-properties')) return jsonResponse(200, [item({})])
      return undefined
    })
    renderPage()

    await screen.findByText('검은 지갑')
    expect(screen.queryByRole('button', { name: '상태 저장' })).not.toBeInTheDocument()
  })

  it('분실물을 등록하면 비운 선택 항목은 빼고 서버에 보낸다', async () => {
    const created: unknown[] = []
    restoreSessionAs(testMember('MEMBER'), (url, init) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, ['고척 스카이돔'])
      if (url === '/api/lost-properties' && init?.method === 'POST') {
        created.push(JSON.parse(String(init.body)))
        return jsonResponse(201, item({ id: 2, title: '우산' }))
      }
      if (url.startsWith('/api/lost-properties')) return jsonResponse(200, [])
      return undefined
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: '분실물 등록' }))
    const form = screen.getByRole('form', { name: '분실물 등록' })
    await userEvent.selectOptions(within(form).getByLabelText('구장'), '고척 스카이돔')
    await userEvent.type(within(form).getByLabelText('제목'), '  우산  ')
    await userEvent.type(within(form).getByLabelText('상세 설명'), '파란 우산')
    await userEvent.click(within(form).getByRole('button', { name: '등록하기' }))

    expect(await screen.findByText(/분실물을 등록했어요/)).toBeInTheDocument()
    expect(created).toEqual([
      { title: '우산', description: '파란 우산', stadiumName: '고척 스카이돔', category: '전자기기' },
    ])
  })

  it('서버가 거절하면 폼에 오류 문구를 보여 준다', async () => {
    restoreSessionAs(testMember('MEMBER'), (url, init) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, ['고척 스카이돔'])
      if (url === '/api/lost-properties' && init?.method === 'POST') {
        return jsonResponse(400, {
          code: 'INVALID_INPUT',
          message: '이미지 주소는 http:// 또는 https:// 로 시작해야 합니다.',
        })
      }
      if (url.startsWith('/api/lost-properties')) return jsonResponse(200, [])
      return undefined
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: '분실물 등록' }))
    const form = screen.getByRole('form', { name: '분실물 등록' })
    await userEvent.selectOptions(within(form).getByLabelText('구장'), '고척 스카이돔')
    await userEvent.type(within(form).getByLabelText('제목'), '우산')
    await userEvent.type(within(form).getByLabelText('상세 설명'), '파란 우산')
    await userEvent.click(within(form).getByRole('button', { name: '등록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미지 주소는 http:// 또는 https:// 로 시작해야 합니다.',
    )
  })

  it('관리자는 상태와 보관 장소를 바꿀 수 있다', async () => {
    const updates: unknown[] = []
    restoreSessionAs(testMember('ADMIN'), (url, init) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, [])
      if (url === '/api/admin/lost-properties/1/status' && init?.method === 'PATCH') {
        updates.push(JSON.parse(String(init.body)))
        return jsonResponse(200, item({ status: 'KEEPING', storageLocation: '1층 안내소' }))
      }
      if (url.startsWith('/api/lost-properties')) return jsonResponse(200, [item({})])
      return undefined
    })
    renderPage()

    const card = (await screen.findByText('검은 지갑')).closest('li') as HTMLElement
    await userEvent.selectOptions(within(card).getByLabelText('검은 지갑 상태'), 'KEEPING')
    await userEvent.type(within(card).getByLabelText('검은 지갑 보관 장소'), '1층 안내소')
    await userEvent.click(within(card).getByRole('button', { name: '상태 저장' }))

    expect(await screen.findByText('상태를 바꿨어요.')).toBeInTheDocument()
    expect(updates).toEqual([{ status: 'KEEPING', storageLocation: '1층 안내소' }])
    expect(within(card).getAllByText('보관 중').length).toBeGreaterThan(0)
  })

  it('http(s)가 아닌 사진 주소는 그리지 않는다', async () => {
    restoreSessionAs(testMember('MEMBER'), (url) => {
      if (url === '/api/lost-properties/stadiums') return jsonResponse(200, [])
      if (url.startsWith('/api/lost-properties')) {
        return jsonResponse(200, [
          item({ id: 1, title: '안전한 사진', imageUrl: 'https://example.com/a.jpg' }),
          item({ id: 2, title: '위험한 사진', imageUrl: 'javascript:alert(1)' }),
        ])
      }
      return undefined
    })
    renderPage()

    const safe = (await screen.findByText('안전한 사진')).closest('li') as HTMLElement
    const unsafe = screen.getByText('위험한 사진').closest('li') as HTMLElement
    expect(safe.querySelector('img')).toHaveAttribute('src', 'https://example.com/a.jpg')
    expect(unsafe.querySelector('img')).toBeNull()
  })
})
