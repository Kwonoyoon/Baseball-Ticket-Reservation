type PaginationProps = {
  /** 지금 쪽 (1부터) */
  page: number
  /** 전체 쪽 수. 0이면 아무것도 그리지 않는다. */
  totalPages: number
  onChange: (page: number) => void
  /** 한 번에 보여 주는 쪽 번호 수. 5면 1~5, 6~10 … 단위로 끊는다. */
  blockSize?: number
}

/**
 * 쪽 번호 이동: « 처음 ‹ 이전 [1 2 3 4 5] 다음 › 마지막 »
 * 쪽 번호는 blockSize개씩 묶어서 보여 주고, 지금 쪽은 aria-current로 표시한다.
 */
export function Pagination({ page, totalPages, onChange, blockSize = 5 }: PaginationProps) {
  if (!(totalPages > 0)) return null

  const blockStart = Math.floor((page - 1) / blockSize) * blockSize + 1
  const blockEnd = Math.min(totalPages, blockStart + blockSize - 1)
  const pages = Array.from({ length: Math.max(0, blockEnd - blockStart + 1) }, (_, i) => blockStart + i)

  const go = (next: number) => {
    const target = Math.min(Math.max(next, 1), totalPages)
    if (target !== page) onChange(target)
  }

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="pagination__step"
        aria-label="처음 쪽"
        disabled={page <= 1}
        onClick={() => go(1)}
      >
        «
      </button>
      <button
        type="button"
        className="pagination__step"
        aria-label="이전 쪽"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        ‹
      </button>
      <ol className="pagination__pages">
        {pages.map((number) => (
          <li key={number}>
            <button
              type="button"
              className={`pagination__page${number === page ? ' is-current' : ''}`}
              aria-label={`${number}쪽`}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => go(number)}
            >
              {number}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="pagination__step"
        aria-label="다음 쪽"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className="pagination__step"
        aria-label="마지막 쪽"
        disabled={page >= totalPages}
        onClick={() => go(totalPages)}
      >
        »
      </button>
    </nav>
  )
}
