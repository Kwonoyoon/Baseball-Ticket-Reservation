import type { LostStatus } from '../api/types'

export const LOST_STATUS_LABELS: Record<LostStatus, string> = {
  REPORTED: '접수 완료',
  KEEPING: '보관 중',
  CLAIMED: '수령 완료',
  DISCARDED: '폐기',
}

export const LOST_STATUSES: LostStatus[] = ['REPORTED', 'KEEPING', 'CLAIMED', 'DISCARDED']

/** 등록할 때 고르는 분류. 서버는 글자만 받으므로 이 목록이 곧 선택지다. */
export const LOST_CATEGORIES = ['전자기기', '지갑/신분증', '가방', '의류', '잡화', '기타']

/** 사진 주소가 안전한 웹 주소(http·https)인지. 서버도 같은 규칙으로 막지만, 화면에서도 한 번 더 확인한다. */
export function isWebImage(url: string | null): url is string {
  return url !== null && /^https?:\/\//i.test(url)
}
