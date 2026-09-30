import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory, PostSummary, Team } from '../api/types'
import { formatDateTime } from '../lib/format'
import { POST_CATEGORIES, postCategoryLabel } from '../lib/postCategory'
import { ErrorMessage, Loading } from './StatusView'

type TeamBoardProps = {
  teamId: number
  team: Team | null
  category: PostCategory
  onCategoryChange: (category: PostCategory) => void
  /** 로그인한 회원만 글쓰기 버튼을 본다. (서버도 막는다) */
  canWrite: boolean
}

/** 한 구단의 게시판: 분류 탭과 가로 폭 전체를 쓰는 글 카드. 구단·분류마다 key를 달리 줘서 쓴다. */
export function TeamBoard({ teamId, team, category, onCategoryChange, canWrite }: TeamBoardProps) {
  const [posts, setPosts] = useState<PostSummary[] | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // 구단·분류가 바뀌면 부모가 key로 새로 그리므로, 여기서는 상태를 비울 필요가 없다.
    const controller = new AbortController()
    api
      .getPosts(teamId, 0, controller.signal, category)
      .then((result) => {
        setPosts(result.items)
        setHasMore(result.hasMore)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '게시글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [teamId, category, reloadKey])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await api.getPosts(teamId, nextPage, undefined, category)
      setPosts((current) => [...(current ?? []), ...result.items])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (e) {
      setError(errorMessage(e, '게시글을 더 불러오지 못했습니다.'))
    } finally {
      setLoadingMore(false)
    }
  }

  const label = postCategoryLabel(category)

  return (
    <section className="team-board" aria-labelledby="team-board-title">
      {/* 구단 이름은 위쪽 구단 띠가 보여 주므로, 제목은 화면 낭독기에만 읽히게 둔다. */}
      <h1 id="team-board-title" className="sr-only">
        {team ? `${team.name} 게시판` : '게시판'}
      </h1>

      <div className="team-board__bar">
        <div className="team-board__tabs" role="tablist" aria-label="게시글 분류">
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
        {canWrite && (
          // 지금 보는 탭을 글쓰기 화면의 기본 분류로 넘긴다.
          <Link to={`/community/${teamId}/write`} state={{ category }} className="button button--primary">
            글쓰기
          </Link>
        )}
      </div>

      <div role="tabpanel" aria-label={`${label} 게시글`}>
        {error ? (
          <ErrorMessage
            message={error}
            onRetry={() => {
              setError(null)
              setReloadKey((key) => key + 1)
            }}
          />
        ) : posts === null ? (
          <Loading />
        ) : posts.length === 0 ? (
          // 글이 없어도 자리가 비어 보이지 않게 빈 카드를 둔다.
          <div className="post-card post-card--empty">
            <p>아직 {label} 글이 없어요.</p>
            <p className="post-card__hint">{canWrite ? '첫 글을 남겨 보세요.' : '로그인하면 첫 글을 남길 수 있어요.'}</p>
          </div>
        ) : (
          <>
            <ul className="post-card-list">
              {posts.map((post) => (
                <li key={post.id}>
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
            {hasMore && (
              <button
                type="button"
                className="button button--ghost team-board__more"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
