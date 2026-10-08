import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { jsonResponse, restoreSessionAs, testMember } from '../test/session'
import { AdminCommunityReportsPage } from './AdminCommunityReportsPage'

const postReport: Report = {
  id: 1,
  targetType: 'POST',
  targetId: 10,
  targetPreview: '오늘 경기 후기',
  targetAuthorName: '야구팬',
  targetContent: '첫 줄입니다.\n둘째 줄에 문제가 되는 내용이 있습니다.',
  postId: 10,
  postTeamId: 3,
  postTitle: '오늘 경기 후기',
  reporterName: '신고자',
  reason: '욕설이 있어요',
  createdAt: '2026-10-08T10:00:00',
}

const commentReport: Report = {
  id: 2,
  targetType: 'COMMENT',
  targetId: 55,
  targetPreview: '문제가 되는 댓글',
  targetAuthorName: '댓글러',
  targetContent: '문제가 되는 댓글',
  postId: 10,
  postTeamId: 3,
  postTitle: '오늘 경기 후기',
  reporterName: '신고자2',
  reason: '광고입니다',
  createdAt: '2026-10-08T11:00:00',
}

const deletedReport: Report = {
  id: 3,
  targetType: 'POST',
  targetId: 11,
  targetPreview: null,
  targetAuthorName: null,
  targetContent: null,
  postId: null,
  postTeamId: null,
  postTitle: null,
  reporterName: '신고자3',
  reason: '도배',
  createdAt: '2026-10-08T12:00:00',
}

function renderReportsPage(reports: Report[]) {
  restoreSessionAs(testMember('ADMIN'), (url) =>
    url === '/api/admin/community/reports' ? jsonResponse(200, reports) : undefined,
  )
  const router = createMemoryRouter([{ path: '/admin/community/reports', element: <AdminCommunityReportsPage /> }], {
    initialEntries: ['/admin/community/reports'],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

/** 신고 한 건이 들어 있는 목록 줄 */
async function reportItem(reason: string) {
  const item = (await screen.findByText(`신고 사유: ${reason}`)).closest('li')
  if (!item) throw new Error('신고 항목이 없습니다.')
  return item
}

describe('AdminCommunityReportsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('신고된 글은 [내용 보기]로 제목과 본문 전체를 펼쳐 보고, 원래 글을 새 탭으로 연다', async () => {
    renderReportsPage([postReport])
    const item = await reportItem('욕설이 있어요')

    const toggle = within(item).getByText('내용 보기')
    const detail = toggle.closest('details')!
    expect(detail.open).toBe(false)
    await userEvent.setup().click(toggle)
    expect(detail.open).toBe(true)

    // 줄바꿈을 그대로 보여 준다.
    expect(within(detail).getByText(/둘째 줄에 문제가 되는 내용이 있습니다/).textContent).toBe(
      '첫 줄입니다.\n둘째 줄에 문제가 되는 내용이 있습니다.',
    )
    const link = within(detail).getByRole('link', { name: '원래 글 열기 ↗' })
    expect(link).toHaveAttribute('href', '/community/3/posts/10')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('신고된 댓글은 어느 글에 단 댓글인지 함께 보여 준다', async () => {
    renderReportsPage([commentReport])
    const item = await reportItem('광고입니다')

    await userEvent.setup().click(within(item).getByText('내용 보기'))
    expect(within(item).getByText('「오늘 경기 후기」 글에 단 댓글')).toBeInTheDocument()
    expect(within(item).getByRole('link', { name: '원래 글 열기 ↗' })).toHaveAttribute('href', '/community/3/posts/10')
  })

  it('이미 지워진 대상은 내용 보기와 삭제 버튼 없이 안내만 한다', async () => {
    renderReportsPage([deletedReport])
    const item = await reportItem('도배')

    expect(within(item).getByText('이미 삭제된 글/댓글입니다.')).toBeInTheDocument()
    expect(within(item).queryByText('내용 보기')).not.toBeInTheDocument()
    expect(within(item).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })
})
