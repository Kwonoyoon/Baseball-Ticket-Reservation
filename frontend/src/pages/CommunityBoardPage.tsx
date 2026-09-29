import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostSummary, Team } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { TeamMark } from '../components/TeamMark'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'

/** 구단별 게시판 목록. 글쓰기는 로그인해야 보인다(서버도 막는다). */
export function CommunityBoardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const id = Number(teamId)
  const { member } = useAuth()

  const [team, setTeam] = useState<Team | null>(null)
  const [posts, setPosts] = useState<PostSummary[] | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api
      .getTeams(controller.signal)
      .then((teams) => setTeam(teams.find((t) => t.id === id) ?? null))
      .catch(() => undefined)
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    setPosts(null)
    setPage(0)
    api
      .getPosts(id, 0, controller.signal)
      .then((result) => {
        setPosts(result.items)
        setHasMore(result.hasMore)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '게시글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [id, reloadKey])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await api.getPosts(id, nextPage)
      setPosts((current) => [...(current ?? []), ...result.items])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (e) {
      setError(errorMessage(e, '게시글을 더 불러오지 못했습니다.'))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="community-board">
      <div className="community-board__head">
        <h1 className="page-title">
          {team && <TeamMark team={team} />}
          {team ? `${team.name} 게시판` : '게시판'}
        </h1>
        {member && (
          <Link to={`/community/${id}/write`} className="button button--primary">
            글쓰기
          </Link>
        )}
      </div>

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
        <EmptyState title="아직 올라온 글이 없습니다." description="첫 글을 남겨 보세요." />
      ) : (
        <>
          <ul className="community-post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <Link to={`/community/${id}/posts/${post.id}`} className="community-post-list__item">
                  <span className="community-post-list__title">{post.title}</span>
                  <span className="community-post-list__meta">
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
            <button type="button" className="button button--ghost community-board__more" disabled={loadingMore}
              onClick={() => void loadMore()}>
              {loadingMore ? '불러오는 중…' : '더 보기'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
