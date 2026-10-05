import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { PostCategory } from '../api/types'
import { ErrorMessage, Loading } from '../components/StatusView'
import { DEFAULT_POST_CATEGORY, parsePostCategory, POST_CATEGORIES } from '../lib/postCategory'
import './CommunityBoardPage.css'

const MAX_TITLE_LENGTH = 100
const MAX_CONTENT_LENGTH = 4000

/**
 * 글쓰기/수정 화면. postId가 있으면 수정, 없으면 새 글이다.
 * 수정일 때는 본인 글만 불러와지고(서버가 확인), 저장도 서버가 작성자를 다시 확인한다.
 */
export function CommunityPostFormPage() {
  const { teamId, postId } = useParams<{ teamId: string; postId?: string }>()
  const id = Number(teamId)
  const navigate = useNavigate()
  const location = useLocation()
  const editing = postId !== undefined

  // 새 글은 게시판에서 보던 탭을 기본 분류로 받는다. (수정은 글에 저장된 분류를 불러온다)
  const [category, setCategory] = useState<PostCategory>(() =>
    parsePostCategory((location.state as { category?: string } | null)?.category),
  )
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!editing) return
    const controller = new AbortController()
    api
      .getPost(Number(postId), controller.signal)
      .then((post) => {
        setCategory(post.category ?? DEFAULT_POST_CATEGORY)
        setTitle(post.title)
        setContent(post.content)
      })
      .catch((e: unknown) => {
        if (!isAbortError(e)) setLoadError(errorMessage(e, '글을 불러오지 못했습니다.'))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [editing, postId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body = { category, title: title.trim(), content: content.trim() }
      const post = editing ? await api.updatePost(Number(postId), body) : await api.createPost(id, body)
      navigate(`/community/${id}/posts/${post.id}`)
    } catch (e) {
      setError(errorMessage(e, '저장하지 못했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="community-post-form">
      <Link
        to={
          editing
            ? `/community/${id}/posts/${postId}`
            : `/community/${id}${category === DEFAULT_POST_CATEGORY ? '' : `?category=${category}`}`
        }
        className="account__back"
      >
        ← 목록으로
      </Link>
      <h1 className="page-title">{editing ? '글 수정' : '글쓰기'}</h1>

      {loadError ? (
        <ErrorMessage message={loadError} />
      ) : loading ? (
        <Loading />
      ) : (
        <section className="panel" aria-label={editing ? '글 수정 양식' : '글쓰기 양식'}>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <fieldset className="field post-category-picker">
              <legend className="field__label">분류</legend>
              <div className="post-category-picker__options">
                {POST_CATEGORIES.map((c) => (
                  <label key={c.value} className="post-category-picker__option">
                    <input
                      type="radio"
                      name="category"
                      value={c.value}
                      checked={category === c.value}
                      onChange={() => setCategory(c.value)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span className="field__label">제목</span>
              <input
                type="text"
                maxLength={MAX_TITLE_LENGTH}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">내용</span>
              <textarea
                className="community-post-form__content"
                maxLength={MAX_CONTENT_LENGTH}
                rows={12}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
            {error && (
              <p className="form__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? '저장하는 중…' : '저장'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
