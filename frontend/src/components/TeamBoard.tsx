import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory, PostSummary, Team } from '../api/types'
import { formatDateTime } from '../lib/format'
import { POST_CATEGORIES, postCategoryLabel } from '../lib/postCategory'
import { ErrorMessage } from './StatusView'

type TeamBoardProps = {
  teamId: number
  team: Team | null
  category: PostCategory
  onCategoryChange: (category: PostCategory) => void
  /** 검색어. 빈 문자열이면 검색 중이 아니다. */
  keyword: string
  onSearch: (keyword: string) => void
  /** 1부터 시작하는 쪽 번호 */
  page: number
  onPageChange: (page: number) => void
  /** 로그인한 회원인지. 글쓰기 버튼은 누구에게나 보이고, 이 값은 빈 목록 안내 문구만 바꾼다. (글 등록은 서버도 막는다) */
  canWrite: boolean
}

/** 글 카드가 하나씩 올라오는 간격 */
const RISE_STEP_MS = 80

/** 한 구단의 게시판: 분류 탭, 검색창, 글 목록, 이전/다음. 구단·분류·검색어·쪽이 바뀔 때마다 key를 달리 줘서 새로 그린다. */
export function TeamBoard({
  teamId,
  team,
  category,
  onCategoryChange,
  keyword,
  onSearch,
  page,
  onPageChange,
  canWrite,
}: TeamBoardProps) {
  const [posts, setPosts] = useState<PostSummary[] | null>(null)
  // 첫 쪽 글만 하나씩 올라온다(더 보기로 붙는 글은 바로 보인다).
  const [riseCount, setRiseCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  // 입력 중인 검색어. 누르기 전까지는 주소(keyword)에 올리지 않는다.
  const [draft, setDraft] = useState(keyword)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // 구단·분류가 바뀌면 부모가 key로 새로 그리므로, 여기서는 상태를 비울 필요가 없다.
    const controller = new AbortController()
    api
      // 서버 쪽 번호는 0부터, 화면 쪽 번호는 1부터다.
      .getPosts(teamId, page - 1, controller.signal, category, keyword || undefined)
      .then((result) => {
        setPosts(result.items)
        setHasMore(result.hasMore)
        setRiseCount(result.items.length)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '게시글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [teamId, category, keyword, page, reloadKey])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    onSearch(draft.trim())
  }

  const label = postCategoryLabel(category)

  return (
    <section className="team-board" aria-labelledby="team-board-title">
      {/* 구단 이름은 위쪽 구단 띠가 보여 주므로, 제목은 화면 낭독기에만 읽히게 둔다. */}
      <h1 id="team-board-title" className="sr-only">
        {team ? `${team.name} 게시판` : '게시판'}
      </h1>

      {/* 왼쪽: 게시판(분류) 목록과 글쓰기. 오른쪽: 고른 게시판의 글. */}
      <aside className="team-board__side">
        <div>
          <p className="team-board__side-title" aria-hidden="true">
            게시판
          </p>
          <div className="team-board__tabs" role="tablist" aria-orientation="vertical" aria-label="게시글 분류">
            {POST_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="tab"
                aria-selected={c.value === category}
                className={`team-board__tab${c.value === category ? ' is-active' : ''}`}
                onClick={() => onCategoryChange(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {/* 비회원에게도 보인다. 누르면 RequireAuth가 로그인으로 보내고, 로그인하면 이 글쓰기 화면으로 돌아온다. */}
        {/* 지금 보는 게시판을 글쓰기 화면의 기본 분류로 넘긴다. */}
        <Link to={`/community/${teamId}/write`} state={{ category }} className="button button--primary">
          글쓰기
        </Link>
      </aside>

      <div className="team-board__main">
        <form className="board-search" role="search" onSubmit={submitSearch}>
          <input
            type="search"
            className="board-search__input"
            value={draft}
            maxLength={50}
            placeholder={`${label} 게시판에서 제목·내용 검색`}
            aria-label="게시글 검색"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="button button--primary button--sm">
            검색
          </button>
        </form>
        {keyword && (
          <p className="board-search__result">
            <strong>{keyword}</strong> 검색 결과
            <button type="button" className="link-button" onClick={() => onSearch('')}>
              검색 지우기
            </button>
          </p>
        )}

        <div role="tabpanel" aria-label={`${label} 게시글`}>
          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError(null)
                setReloadKey((key) => key + 1)
              }}
            />
          ) : posts ===
            null ? null : posts // 불러오는 동안은 "불러오는 중" 표시 없이 비워 둔다. 다 오면 글이 하나씩 올라온다.
            .length === 0 ? (
            // 글이 없어도 자리가 비어 보이지 않게 빈 카드를 둔다.
            <div className="post-card post-card--empty">
              {keyword ? (
                <p>
                  {label} 게시판에 "{keyword}"이(가) 들어간 글이 없어요.
                </p>
              ) : page > 1 ? (
                <p>이 쪽에는 글이 없어요.</p>
              ) : (
                <>
                  <p>아직 {label} 글이 없어요.</p>
                  <p className="post-card__hint">
                    {canWrite ? '첫 글을 남겨 보세요.' : '로그인하면 첫 글을 남길 수 있어요.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <ul className="post-card-list">
                {posts.map((post, index) => (
                  <li
                    key={post.id}
                    className={index < riseCount ? 'is-rising' : undefined}
                    style={
                      index < riseCount
                        ? ({
                            animationDelay: `${index * RISE_STEP_MS}ms`,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <Link to={`/community/${teamId}/posts/${post.id}`} className="post-card">
                      <span className="post-card__badge">{postCategoryLabel(post.category)}</span>
                      <span className="post-card__title">{post.title}</span>
                      {post.preview && <span className="post-card__preview">{post.preview}</span>}
                      <span className="post-card__meta">
                        <span>{post.authorName}</span>
                        <span>{formatDateTime(post.createdAt)}</span>
                        <span>조회 {post.viewCount}</span>
                        <span>좋아요 {post.likeCount}</span>
                        <span>댓글 {post.commentCount}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 이전/다음만 둔다. 전체 글 수는 세지 않으므로(서버는 다음 쪽이 있는지만 안다) 숫자 쪽 번호는 없다. */}
        {posts !== null && (page > 1 || hasMore) && (
          <nav className="board-pager" aria-label="페이지 이동">
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              이전
            </button>
            <span className="board-pager__page" aria-current="page">
              {page}
            </span>
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={!hasMore}
              onClick={() => onPageChange(page + 1)}
            >
              다음
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
