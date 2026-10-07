import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostSummary } from '../api/types'
import { postCategoryLabel } from '../lib/postCategory'

/** 인기글로 보여 줄 개수 */
const POPULAR_POST_COUNT = 3

type PopularPostsProps = {
  teamId: number
}

/**
 * 이 구단 게시판에서 좋아요를 가장 많이 받은 글. 좋아요가 하나도 없으면 인기글이 없는 것이라 자리를 비운다.
 * 구단을 바꾸면 부모가 key를 바꿔 새로 그리므로, 여기서는 구단이 바뀐 경우를 따로 다루지 않는다.
 */
export function PopularPosts({ teamId }: PopularPostsProps) {
  const [posts, setPosts] = useState<PostSummary[]>([])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getPopularPosts(teamId, POPULAR_POST_COUNT, controller.signal)
      .then(setPosts)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setPosts([])
      })
    return () => controller.abort()
  }, [teamId])

  if (posts.length === 0) return null

  return (
    <section className="popular-posts" aria-label="인기글">
      <h2 className="community-section-title">인기글</h2>
      <ol className="popular-posts__list">
        {posts.map((post, index) => (
          <li key={post.id}>
            <Link to={`/community/${teamId}/posts/${post.id}`} className="popular-posts__item">
              <span className="popular-posts__rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="popular-posts__badge">{postCategoryLabel(post.category)}</span>
              <span className="popular-posts__title">{post.title}</span>
              <span className="popular-posts__likes">좋아요 {post.likeCount}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
