import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { errorMessage, isAbortError } from '../api/client'
import { api } from '../api/endpoints'
import type { Comment, PostDetail } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { ErrorMessage, Loading } from '../components/StatusView'
import { formatDateTime } from '../lib/format'
import { postCategoryLabel } from '../lib/postCategory'
import './CommunityBoardPage.css'

const MAX_COMMENT_LENGTH = 1000
const MAX_REPORT_REASON_LENGTH = 500

type ReportTarget = { type: 'post' } | { type: 'comment'; id: number }

/** 게시글 상세: 본문, 좋아요, 댓글, 신고. 수정·삭제는 본인 글에서만 보인다(서버도 확인한다). */
export function CommunityPostPage() {
  const { teamId, postId } = useParams<{ teamId: string; postId: string }>()
  const id = Number(postId)
  const navigate = useNavigate()
  const { member, loading: authLoading, isAdmin } = useAuth()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // 비회원이 좋아요를 눌렀을 때 띄우는 로그인 안내. 로그인하면 이 글로 돌아오게 주소를 함께 넘긴다.
  const [loginPrompt, setLoginPrompt] = useState(false)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // 새로고침으로 이 화면에 바로 들어오면 로그인 세션 복원이 끝나기 전에 글을 먼저 불러올 수 있다.
  // 그러면 서버가 비회원 요청으로 보고 liked·mine을 전부 false로 내려주는데, 이후엔 다시 안 불러오니 틀린 채로 남는다.
  // 세션 복원이 끝난 뒤에 불러오도록 기다린다.
  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    api
      .getPost(id, controller.signal)
      .then(setPost)
      .catch((e: unknown) => {
        if (!isAbortError(e)) setError(errorMessage(e, '글을 불러오지 못했습니다.'))
      })
    return () => controller.abort()
  }, [id, authLoading])

  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    api
      .getComments(id, controller.signal)
      .then(setComments)
      .catch(() => undefined)
    return () => controller.abort()
  }, [id, authLoading])

  const toggleLike = async () => {
    if (!post) return
    setLikeBusy(true)
    try {
      const result = await api.togglePostLike(id)
      setPost({ ...post, liked: result.liked, likeCount: result.likeCount })
    } catch (e) {
      setNotice(errorMessage(e, '좋아요를 처리하지 못했습니다.'))
    } finally {
      setLikeBusy(false)
    }
  }

  /** asAdmin: 본인 글이 아니어도 관리자 권한으로 지운다. (서버도 관리자만 허용한다) */
  const deletePost = async (asAdmin = false) => {
    const question = asAdmin
      ? '관리자 권한으로 이 글을 삭제할까요?\n되돌릴 수 없습니다.'
      : '이 글을 삭제할까요?\n되돌릴 수 없습니다.'
    if (!window.confirm(question)) return
    try {
      if (asAdmin) await api.deletePostAsAdmin(id)
      else await api.deletePost(id)
      navigate(`/community/${teamId}`)
    } catch (e) {
      setNotice(errorMessage(e, '삭제하지 못했습니다.'))
    }
  }

  const openReport = (target: ReportTarget) => {
    setReportTarget(target)
    setReportReason('')
    setReportError(null)
  }

  const closeReport = () => {
    setReportTarget(null)
    setReportReason('')
    setReportError(null)
  }

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reportTarget) return
    if (!reportReason.trim()) {
      setReportError('신고 사유를 입력해 주세요.')
      return
    }
    setReportSubmitting(true)
    setReportError(null)
    try {
      if (reportTarget.type === 'post') await api.reportPost(id, reportReason.trim())
      else await api.reportComment(reportTarget.id, reportReason.trim())
      closeReport()
      setNotice('신고가 접수되었습니다.')
    } catch (e) {
      setReportError(errorMessage(e, '신고하지 못했습니다.'))
    } finally {
      setReportSubmitting(false)
    }
  }

  const deleteComment = async (commentId: number, asAdmin = false) => {
    if (!window.confirm(asAdmin ? '관리자 권한으로 이 댓글을 삭제할까요?' : '이 댓글을 삭제할까요?')) return
    try {
      if (asAdmin) await api.deleteCommentAsAdmin(commentId)
      else await api.deleteComment(commentId)
      setComments((current) => current?.filter((c) => c.id !== commentId) ?? null)
      setPost((current) => (current ? { ...current, commentCount: Math.max(0, current.commentCount - 1) } : current))
    } catch (e) {
      setNotice(errorMessage(e, '삭제하지 못했습니다.'))
    }
  }

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commentText.trim()) {
      setCommentError('댓글 내용을 입력해 주세요.')
      return
    }
    setSubmittingComment(true)
    setCommentError(null)
    try {
      const created = await api.createComment(id, commentText.trim())
      setComments((current) => [...(current ?? []), created])
      setPost((current) => (current ? { ...current, commentCount: current.commentCount + 1 } : current))
      setCommentText('')
    } catch (e) {
      setCommentError(errorMessage(e, '댓글을 남기지 못했습니다.'))
    } finally {
      setSubmittingComment(false)
    }
  }

  if (error) return <ErrorMessage message={error} />
  if (!post) return <Loading />

  return (
    <div className="community-post">
      <Link
        to={`/community/${teamId}${post.category && post.category !== 'FREE' ? `?category=${post.category}` : ''}`}
        className="account__back"
      >
        ← 목록으로
      </Link>

      <article className="panel community-post__article">
        {post.category && <span className="post-card__badge">{postCategoryLabel(post.category)}</span>}
        <h1 className="community-post__title">{post.title}</h1>
        <p className="community-post__meta">
          <span>{post.authorName}</span>
          <span>
            {formatDateTime(post.createdAt)}
            {post.updatedAt !== post.createdAt && ' (수정됨)'}
          </span>
          <span>조회 {post.viewCount}</span>
        </p>
        <p className="community-post__content">{post.content}</p>

        <div className="community-post__actions">
          <button
            type="button"
            className={`button button--sm ${post.liked ? 'button--primary' : 'button--ghost'}`}
            // 비회원은 비활성화하지 않고 눌러 보게 한 뒤 로그인 안내를 띄운다. (서버는 어차피 비회원 좋아요를 막는다)
            disabled={likeBusy}
            onClick={() => (member ? void toggleLike() : setLoginPrompt(true))}
          >
            좋아요 {post.likeCount}
          </button>
          {member && !post.mine && (
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => openReport({ type: 'post' })}
            >
              신고
            </button>
          )}
          {post.mine && (
            <>
              <Link to={`/community/${teamId}/posts/${id}/edit`} className="button button--ghost button--sm">
                수정
              </Link>
              <button type="button" className="button button--danger button--sm" onClick={() => void deletePost()}>
                삭제
              </button>
            </>
          )}
          {/* 관리자는 남의 글도 신고 없이 바로 지울 수 있다. (서버도 관리자만 허용한다) */}
          {isAdmin && !post.mine && (
            <button type="button" className="button button--danger button--sm" onClick={() => void deletePost(true)}>
              관리자 삭제
            </button>
          )}
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {loginPrompt && !member && (
          <p className="notice" role="status">
            좋아요는 로그인한 뒤에 누를 수 있어요.{' '}
            <Link to={`/login?redirect=${encodeURIComponent(`/community/${teamId}/posts/${id}`)}`}>로그인하기</Link>
          </p>
        )}
        {reportTarget?.type === 'post' && (
          <form className="community-report-form" onSubmit={submitReport}>
            <label className="field">
              <span className="field__label">신고 사유</span>
              <textarea
                rows={2}
                maxLength={MAX_REPORT_REASON_LENGTH}
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                autoFocus
              />
            </label>
            {reportError && (
              <p className="form__error" role="alert">
                {reportError}
              </p>
            )}
            <div className="community-report-form__actions">
              <button type="submit" className="button button--danger button--sm" disabled={reportSubmitting}>
                {reportSubmitting ? '접수하는 중…' : '신고 접수'}
              </button>
              <button type="button" className="button button--ghost button--sm" onClick={closeReport}>
                취소
              </button>
            </div>
          </form>
        )}
      </article>

      <section className="panel community-comments" aria-label="댓글">
        <h2 className="panel__title">댓글 {post.commentCount}</h2>

        {comments === null ? (
          <Loading label="댓글을 불러오는 중…" />
        ) : comments.length === 0 ? (
          <p className="community-comments__empty">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="community-comments__list">
            {comments.map((comment) => (
              <li key={comment.id} className="community-comments__item-wrap">
                <div className="community-comments__item">
                  <div className="community-comments__body">
                    <p className="community-comments__meta">
                      <span>{comment.authorName}</span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </p>
                    <p>{comment.content}</p>
                  </div>
                  <div className="community-comments__actions">
                    {comment.mine ? (
                      <button
                        type="button"
                        className="button button--ghost button--sm"
                        onClick={() => void deleteComment(comment.id)}
                      >
                        삭제
                      </button>
                    ) : (
                      member && (
                        <button
                          type="button"
                          className="button button--ghost button--sm"
                          onClick={() => openReport({ type: 'comment', id: comment.id })}
                        >
                          신고
                        </button>
                      )
                    )}
                    {isAdmin && !comment.mine && (
                      <button
                        type="button"
                        className="button button--danger button--sm"
                        onClick={() => void deleteComment(comment.id, true)}
                      >
                        관리자 삭제
                      </button>
                    )}
                  </div>
                </div>
                {reportTarget?.type === 'comment' && reportTarget.id === comment.id && (
                  <form className="community-report-form" onSubmit={submitReport}>
                    <label className="field">
                      <span className="field__label">신고 사유</span>
                      <textarea
                        rows={2}
                        maxLength={MAX_REPORT_REASON_LENGTH}
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        autoFocus
                      />
                    </label>
                    {reportError && (
                      <p className="form__error" role="alert">
                        {reportError}
                      </p>
                    )}
                    <div className="community-report-form__actions">
                      <button type="submit" className="button button--danger button--sm" disabled={reportSubmitting}>
                        {reportSubmitting ? '접수하는 중…' : '신고 접수'}
                      </button>
                      <button type="button" className="button button--ghost button--sm" onClick={closeReport}>
                        취소
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {member ? (
          <form className="community-comments__form" onSubmit={submitComment}>
            <label className="field">
              <span className="field__label">댓글 남기기</span>
              <textarea
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
            </label>
            {commentError && (
              <p className="form__error" role="alert">
                {commentError}
              </p>
            )}
            <button type="submit" className="button button--primary button--sm" disabled={submittingComment}>
              {submittingComment ? '등록하는 중…' : '댓글 등록'}
            </button>
          </form>
        ) : (
          <p className="community-comments__empty">
            <Link to="/login">로그인</Link>하면 댓글을 남길 수 있어요.
          </p>
        )}
      </section>
    </div>
  )
}
