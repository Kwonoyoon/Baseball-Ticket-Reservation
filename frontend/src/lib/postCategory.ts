import type { PostCategory } from '../api/types'

/** 게시판 탭 순서. 서버의 PostCategory와 같은 값이다. */
export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'FREE', label: '자유' },
  { value: 'GAME', label: '경기' },
  { value: 'CHEER', label: '응원' },
  { value: 'TICKET_TRANSFER', label: '티켓 양도' },
]

export const DEFAULT_POST_CATEGORY: PostCategory = 'FREE'

export function postCategoryLabel(category: PostCategory | undefined): string {
  return POST_CATEGORIES.find((c) => c.value === category)?.label ?? '자유'
}

/** 주소창의 ?category= 값을 믿을 수 있는 값으로 바꾼다. 모르는 값이면 기본 탭. */
export function parsePostCategory(value: string | null | undefined): PostCategory {
  return POST_CATEGORIES.some((c) => c.value === value) ? (value as PostCategory) : DEFAULT_POST_CATEGORY
}
