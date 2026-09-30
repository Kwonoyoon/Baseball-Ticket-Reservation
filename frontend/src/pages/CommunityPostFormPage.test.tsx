import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { CommunityPostFormPage } from './CommunityPostFormPage'

const savedPost = {
  id: 20,
  teamId: 1,
  category: 'CHEER',
  authorId: 1,
  authorName: '야구팬',
  title: '오늘도 이기자',
  content: '목이 터져라 응원합니다',
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  createdAt: '2026-09-29T10:00:00',
  updatedAt: '2026-09-29T10:00:00',
}

function renderForm(initialEntry: InitialEntry) {
  const router = createMemoryRouter(
    [
      { path: '/community/:teamId/write', element: <CommunityPostFormPage /> },
      { path: '/community/:teamId/posts/:postId/edit', element: <CommunityPostFormPage /> },
      { path: '/community/:teamId/posts/:postId', element: <p>글 보기</p> },
    ],
    { initialEntries: [initialEntry] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

/** 그 주소로 보낸 요청 본문을 꺼낸다. (세션 복원도 POST라서 주소까지 본다) */
function sentBody(fetchMock: ReturnType<typeof vi.fn>, url: string, method: string) {
  const call = fetchMock.mock.calls.find(
    ([input, init]) => String(input) === url && (init as RequestInit | undefined)?.method === method,
  )
  if (!call) throw new Error(`${method} ${url} 요청이 없었습니다.`)
  return JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>
}

describe('CommunityPostFormPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('새 글은 게시판에서 보던 분류로 시작하고, 고른 분류로 저장한다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/teams/1/posts' && init?.method === 'POST') return jsonResponse(201, savedPost)
      return undefined
    })
    renderForm({ pathname: '/community/1/write', state: { category: 'GAME' } })

    expect(await screen.findByRole('radio', { name: '경기' })).toBeChecked()
    // 목록으로 돌아가면 보던 탭으로 간다.
    expect(screen.getByRole('link', { name: /목록으로/ })).toHaveAttribute('href', '/community/1?category=GAME')

    await userEvent.click(screen.getByRole('radio', { name: '응원' }))
    await userEvent.type(screen.getByLabelText('제목'), '오늘도 이기자')
    await userEvent.type(screen.getByLabelText('내용'), '목이 터져라 응원합니다')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('글 보기')).toBeInTheDocument()
    expect(sentBody(fetchMock, '/api/teams/1/posts', 'POST')).toEqual({ category: 'CHEER', title: '오늘도 이기자', content: '목이 터져라 응원합니다' })
  })

  it('분류를 넘겨받지 않으면 자유로 시작한다', async () => {
    restoreSessionAs(testMember())
    renderForm('/community/1/write')

    expect(await screen.findByRole('radio', { name: '자유' })).toBeChecked()
  })

  it('글을 고칠 때는 저장된 분류를 불러와 함께 보낸다', async () => {
    const fetchMock = restoreSessionAs(testMember(), (url, init) => {
      if (url === '/api/posts/20' && init?.method === 'PUT') return jsonResponse(200, savedPost)
      if (url === '/api/posts/20') return jsonResponse(200, savedPost)
      return undefined
    })
    renderForm('/community/1/posts/20/edit')

    expect(await screen.findByRole('radio', { name: '응원' })).toBeChecked()
    expect(screen.getByLabelText('제목')).toHaveValue('오늘도 이기자')

    await userEvent.click(screen.getByRole('radio', { name: '경기' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(sentBody(fetchMock, '/api/posts/20', 'PUT')).toMatchObject({ category: 'GAME' }))
  })
})
