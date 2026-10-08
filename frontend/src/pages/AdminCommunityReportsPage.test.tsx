import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PostDetail, Report } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { AdminCommunityReportsPage } from './AdminCommunityReportsPage'

const postReport: Report = {
  id: 1,
  targetType: 'POST',
  targetId: 10,
  targetStatus: 'ACTIVE',
  targetPreview: '오늘 경기 후기',
  targetAuthorName: '야구팬',
  targetContent: '첫 줄입니다.\n둘째 줄에 문제가 되는 내용이 있습니다.',
  postId: 10,
  postTeamId: 3,
  postTitle: '오늘 경기 후기',
  reporterName: '김신고',
  reason: '욕설이 있어요',
  createdAt: '2026-10-08T10:00:00',
}

const commentReport: Report = {
  id: 2,
  targetType: 'COMMENT',
  targetId: 55,
  targetStatus: 'ACTIVE',
  targetPreview: '싸게 표 팝니다',
  targetAuthorName: '댓글러',
  targetContent: '싸게 표 팝니다',
  postId: 10,
  postTeamId: 3,
  postTitle: '오늘 경기 후기',
  reporterName: '신고자2',
  reason: '광고입니다',
  createdAt: '2026-10-08T11:00:00',
}

const post: PostDetail = {
  id: 10,
  teamId: 3,
  category: 'FREE',
  authorId: 7,
  authorName: '야구팬',
  title: '오늘 경기 후기',
  content: '첫 줄입니다.\n둘째 줄에 문제가 되는 내용이 있습니다.',
  viewCount: 12,
  likeCount: 0,
  commentCount: 1,
  liked: false,
  mine: false,
  createdAt: '2026-10-08T09:00:00',
  updatedAt: '2026-10-08T09:00:00',
}

/** 가짜 서버. 신고를 처리하면 그 신고의 대상 상태를 바꿔 다시 돌려준다. */
function renderReportsPage(initial: Report[]) {
  let reports = initial
  const fetchMock = restoreSessionAs(testMember('ADMIN'), (url, init) => {
    if (url === '/api/admin/community/reports') return jsonResponse(200, reports)
    if (url === '/api/admin/community/posts/10') return jsonResponse(200, post)
    const match = /^\/api\/admin\/community\/reports\/(\d+)\/target$/.exec(url)
    if (match && init?.method === 'DELETE') {
      reports = reports.map((report) =>
        report.id === Number(match[1])
          ? { ...report, targetStatus: report.targetType === 'POST' ? 'DELETED' : 'DELETED_BY_REPORT' }
          : report,
      )
      return new Response(null, { status: 204 })
    }
    return undefined
  })
  const router = createMemoryRouter([{ path: '/admin/community/reports', element: <AdminCommunityReportsPage /> }], {
    initialEntries: ['/admin/community/reports'],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return fetchMock
}

/** 신고 한 건 (신고 사유로 찾는다) */
async function reportItem(reason: string) {
  const item = (await screen.findByText(reason)).closest('li')
  if (!item) throw new Error('신고 항목이 없습니다.')
  return item
}

describe('AdminCommunityReportsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('신고마다 신고 시간·신고자·신고 사유를 보여 준다', async () => {
    renderReportsPage([postReport])
    const item = await reportItem('욕설이 있어요')

    const info = item.querySelector('dl')!
    expect(within(info).getByText('신고 시간').nextElementSibling).toHaveTextContent('2026.10.08 10:00')
    expect(within(info).getByText('신고자').nextElementSibling).toHaveTextContent('김신고')
    expect(within(info).getByText('신고 사유').nextElementSibling).toHaveTextContent('욕설이 있어요')
    // 신고 사유는 한 줄을 다 쓰는 카드다.
    expect(within(info).getByText('신고 사유').parentElement).toHaveClass('admin-report__field--wide')
    // 펼치기 전에는 글 내용을 가져오지 않는다.
    expect(within(item).queryByRole('article')).not.toBeInTheDocument()
  })

  it('게시글 신고는 [내용 보기]로 게시글을 가져와 아래에 펼친다 (조회수를 올리지 않는 관리자 조회)', async () => {
    const fetchMock = renderReportsPage([postReport])
    const item = await reportItem('욕설이 있어요')

    const toggle = within(item).getByRole('button', { name: '내용 보기 ▾' })
    await userEvent.setup().click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(document.activeElement).toBe(within(item).getByLabelText('신고된 게시글 내용'))

    const article = await within(item).findByRole('article', { name: '신고된 게시글' })
    expect(within(article).getByRole('heading', { name: '오늘 경기 후기' })).toBeInTheDocument()
    expect(within(article).getByText(/둘째 줄에 문제가 되는 내용/).textContent).toBe(
      '첫 줄입니다.\n둘째 줄에 문제가 되는 내용이 있습니다.',
    )
    expect(within(article).getByRole('link', { name: '원래 글 열기 ↗' })).toHaveAttribute('href', '/community/3/posts/10')
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/admin/community/posts/10')).toBe(true)
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/posts/10')).toBe(false)

    await userEvent.setup().click(within(item).getByRole('button', { name: '내용 닫기 ▴' }))
    expect(within(item).queryByRole('article')).not.toBeInTheDocument()
  })

  it('댓글 신고는 [내용 보기]로 댓글과 어느 글에 단 댓글인지 펼친다', async () => {
    renderReportsPage([commentReport])
    const item = await reportItem('광고입니다')

    await userEvent.setup().click(within(item).getByRole('button', { name: '내용 보기 ▾' }))
    // 펼친 내용으로 초점이 옮겨 간다.
    expect(document.activeElement).toBe(within(item).getByLabelText('신고된 댓글 내용'))
    const article = within(item).getByRole('article', { name: '신고된 댓글' })
    expect(article).toHaveTextContent('「오늘 경기 후기」 글에 단 댓글')
    expect(article).toHaveTextContent('댓글러')
    expect(article).toHaveTextContent('싸게 표 팝니다')
  })

  it('댓글을 삭제하면 신고 처리됨으로 바뀌고, 원래 내용은 관리자가 계속 볼 수 있다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderReportsPage([commentReport])
    const item = await reportItem('광고입니다')

    await userEvent.setup().click(within(item).getByRole('button', { name: '삭제' }))

    expect(await screen.findByRole('status')).toHaveTextContent('댓글을 신고 처리로 삭제했습니다.')
    const updated = await reportItem('광고입니다')
    await waitFor(() => expect(within(updated).getByText('신고 처리됨')).toBeInTheDocument())
    expect(within(updated).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()

    await userEvent.setup().click(within(updated).getByRole('button', { name: '내용 보기 ▾' }))
    expect(within(updated).getByRole('article', { name: '신고된 댓글' })).toHaveTextContent(
      '게시글 화면에는 "신고 처리로 삭제된 댓글입니다."로 보입니다.',
    )
  })

  it('게시글을 삭제하면 삭제됨으로 바뀌고 내용 보기와 삭제 버튼이 사라진다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderReportsPage([postReport])
    const item = await reportItem('욕설이 있어요')

    await userEvent.setup().click(within(item).getByRole('button', { name: '삭제' }))

    expect(await screen.findByRole('status')).toHaveTextContent('게시글을 삭제했습니다.')
    const updated = await reportItem('욕설이 있어요')
    await waitFor(() => expect(within(updated).getByText('이미 삭제된 게시글입니다.')).toBeInTheDocument())
    expect(within(updated).queryByRole('button', { name: /내용 보기/ })).not.toBeInTheDocument()
    expect(within(updated).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('삭제를 확인하지 않으면 지우지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderReportsPage([commentReport])
    const item = await reportItem('광고입니다')

    await userEvent.setup().click(within(item).getByRole('button', { name: '삭제' }))
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/target'))).toBe(false)
  })
})
