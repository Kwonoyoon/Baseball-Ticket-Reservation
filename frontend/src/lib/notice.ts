import type { NoticeCategory, NoticeScope } from '../api/types'

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  UPDATE: '시스템 업데이트',
  EVENT: '이벤트',
  MAINTENANCE: '점검',
}

export const NOTICE_CATEGORIES: NoticeCategory[] = ['UPDATE', 'EVENT', 'MAINTENANCE']

export const NOTICE_SCOPE_LABELS: Record<NoticeScope, string> = {
  GLOBAL: '전체 공지',
  COMMUNITY: '커뮤니티 공지',
}

export const NOTICE_SCOPES: NoticeScope[] = ['GLOBAL', 'COMMUNITY']
