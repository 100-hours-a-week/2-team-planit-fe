import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { resolveImageUrl } from '../utils/image.ts'
import {
  createComment,
  deleteComment,
  deletePost,
  getPost,
  getPostComments,
  likePost,
  unlikePost,
} from '../api/posts'
import type { CommentItem, PostDetail } from '../api/posts'
import { useAuth } from '../store'

const COMMENT_PAGE_SIZE = 20

const formatTimeAgo = (value: string) => {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return ''
  }
  const diffMinutes = Math.max(Math.floor((Date.now() - timestamp) / 60000), 1)
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}일 전`
}

export default function PostDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null)
  const commentSentinelRef = useRef<HTMLDivElement | null>(null)

  const [detail, setDetail] = useState<PostDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeProcessing, setLikeProcessing] = useState(false)
  const [postDeleteModal, setPostDeleteModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<CommentItem | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentPage, setCommentPage] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  useEffect(() => {
    if (!id) {
      setError('잘못된 게시글입니다.')
      setIsLoading(false)
      return
    }
    let cancelled = false

    const fetchDetail = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await getPost(id)
        if (cancelled) {
          return
        }
        setDetail(response)
        setLikeCount(response.likeCount)
        setLiked(response.likedByRequester)
      } catch {
        if (!cancelled) {
          setError('게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [id])

  const fetchCommentPage = useCallback(
    async (pageNumber: number, replace = false) => {
      const postId = detail?.postId
      if (!postId) {
        return
      }
      setCommentsLoading(true)
      try {
        const response = await getPostComments(postId, {
          page: pageNumber,
          size: COMMENT_PAGE_SIZE,
        })
        const isArrayResponse = Array.isArray(response)
        const incomingComments = isArrayResponse
          ? response
          : Array.isArray(response.comments)
            ? response.comments
            : Array.isArray(response.content)
              ? response.content
              : []
        const normalizedComments = incomingComments.map((item) => ({
          ...item,
          deletable:
            typeof item.deletable === 'boolean'
              ? item.deletable
              : Boolean(user && item.authorId === user.id),
        }))
        setComments((prev) => (replace ? normalizedComments : [...prev, ...normalizedComments]))
        const hasMore = isArrayResponse
          ? incomingComments.length === COMMENT_PAGE_SIZE
          : response.hasMore ??
            (typeof response.last === 'boolean'
              ? !response.last
              : incomingComments.length === COMMENT_PAGE_SIZE)
        setHasMoreComments(Boolean(hasMore))
        setCommentPage(pageNumber + 1)
      } catch {
        showToast('댓글을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setCommentsLoading(false)
      }
    },
    [detail?.postId],
  )

  const loadMoreComments = useCallback(() => {
    if (commentsLoading || !hasMoreComments) {
      return
    }
    fetchCommentPage(commentPage)
  }, [commentsLoading, commentPage, fetchCommentPage, hasMoreComments])

  useEffect(() => {
    if (!detail?.postId) return
    fetchCommentPage(0, true)
  }, [detail?.postId, fetchCommentPage])

  useEffect(() => {
    if (!hasMoreComments || commentsLoading) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreComments()
        }
      },
      { rootMargin: '140px' },
    )
    const current = commentSentinelRef.current
    if (current) {
      observer.observe(current)
    }
    return () => {
      observer.disconnect()
    }
  }, [hasMoreComments, commentsLoading, loadMoreComments])

  const handleToggleLike = async () => {
    if (!detail || likeProcessing) {
      return
    }
    setLikeProcessing(true)
    try {
      if (liked) {
        await unlikePost(detail.postId)
        setLikeCount((count) => Math.max(count - 1, 0))
        setLiked(false)
      } else {
        await likePost(detail.postId)
        setLikeCount((count) => count + 1)
        setLiked(true)
      }
    } catch {
      showToast('좋아요 처리에 실패했습니다.')
    } finally {
      setLikeProcessing(false)
    }
  }

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    if (value.length > 500) {
      return
    }
    setNewComment(value)
    const textarea = commentInputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = 5 * 28
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      showToast('로그인이 필요합니다')
      navigate('/login')
      return
    }
    const trimmed = newComment.trim()
    if (!trimmed) {
      showToast('댓글을 입력해 주세요')
      return
    }
    if (!detail) {
      showToast('게시글 정보를 확인할 수 없습니다.')
      return
    }
    console.log('submit comment', detail.postId, trimmed)
    setCommentSubmitting(true)
    try {
      const created = await createComment(detail.postId, { content: trimmed })
      setComments((prev) => [...prev, created])
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              commentCount: Math.max((prev.commentCount ?? 0) + 1, 0),
            }
          : prev,
      )
      setNewComment('')
      const textarea = commentInputRef.current
      if (textarea) {
        textarea.style.height = 'auto'
      }
      setPendingHighlightId(created.commentId)
    } catch {
      showToast('댓글 등록에 실패했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmitComment()
    }
  }

  const handleDeletePost = async () => {
    if (!detail) {
      return
    }
    setPostDeleteModal(false)
    try {
      await deletePost(detail.postId)
      navigate('/posts')
    } catch {
      showToast('게시글 삭제에 실패했습니다.')
    }
  }

  const handleDeleteComment = async () => {
    if (!detail || !commentToDelete) {
      return
    }
    const target = commentToDelete
    setCommentToDelete(null)
    try {
      await deleteComment(detail.postId, target.commentId)
      setComments((prev) => prev.filter((item) => item.commentId !== target.commentId))
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              commentCount: Math.max((prev.commentCount ?? 0) - 1, 0),
            }
          : prev,
      )
    } catch {
      showToast('댓글 삭제에 실패했습니다.')
    }
  }

  const handlePlanCardClick = () => {
    if (!detail?.planId) {
      return
    }
    navigate(`/trips/${detail.planId}/itineraries`, {
      state: { readonly: true },
    })
  }

  const handleCloseLightbox = () => {
    setLightboxImage(null)
  }

  useEffect(() => {
    if (!lightboxImage) {
      document.body.style.overflow = ''
      return undefined
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseLightbox()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxImage])

  const planPeriodLabel =
    detail?.planStartDate && detail?.planEndDate
      ? `${detail.planStartDate} ~ ${detail.planEndDate}`
      : detail?.planStartDate || detail?.planEndDate || ''

  const displayedCommentCount = comments.length
  const isAuthor = detail?.author.authorId === user?.id

  return (
    <main className="post-detail-shell">
      <button className="post-detail-back" type="button" onClick={() => navigate('/posts')}>
        ← 게시물 목록
      </button>
      {toastInfo && (
        <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />
      )}
      {isLoading && <p className="post-status">게시물 가져오는 중</p>}
      {!isLoading && error && <p className="post-status post-status--error">{error}</p>}
      {!isLoading && !error && detail && (
        <>
          <section className="post-detail-card">
            <header className="post-detail-header">
              <p className="post-detail-board">
                <span className="post-detail-board__name">{detail.boardName}</span>
                <span className="post-detail-board__description">{detail.boardDescription}</span>
              </p>
              <div className="post-detail-title-row">
                <h1>{detail.title}</h1>
                <span className="post-detail-title-time" aria-label="작성 시간">
                  {formatTimeAgo(detail.createdAt)}
                </span>
              </div>
              <div className="post-detail-meta">
                <div className="post-detail-author">
                  <img
                    src={resolveImageUrl(detail.author.profileImageUrl, DEFAULT_AVATAR_URL)}
                    alt={`${detail.author.nickname} 프로필`}
                  />
                  <div>
                    <strong>{detail.author.nickname}</strong>
                    <span>{formatTimeAgo(detail.createdAt)}</span>
                  </div>
                </div>
                <div className="post-detail-stats">
                  <button
                    type="button"
                    className={`action-like${liked ? ' liked' : ''}`}
                    onClick={handleToggleLike}
                    disabled={likeProcessing}
                  >
                    👍 {likeCount}
                  </button>
                  <span>💬 {displayedCommentCount}</span>
                </div>
              </div>
            {isAuthor && (
              <div className="post-detail-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => navigate(`/posts/${detail.postId}/edit`)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="secondary-btn danger"
                  onClick={() => setPostDeleteModal(true)}
                >
                  삭제
                </button>
              </div>
            )}
          </header>
          {detail.boardType === 'PLAN_SHARE' && detail.planId && (
            <article
              className="plan-share-card"
              role="button"
              tabIndex={0}
              onClick={handlePlanCardClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handlePlanCardClick()
                }
              }}
            >
              <div className="plan-share-card__image">
                <img
                  src={resolveImageUrl(detail.planThumbnailImageUrl, DEFAULT_AVATAR_URL)}
                  alt={detail.planTitle ? `${detail.planTitle} 썸네일` : '공유된 일정 이미지'}
                />
              </div>
              <div className="plan-share-card__body">
                <p className="plan-share-card__label">공유된 일정</p>
                <h2>{detail.planTitle || '공유된 일정'}</h2>
                {planPeriodLabel && (
                  <p className="plan-share-card__period">{planPeriodLabel}</p>
                )}
              </div>
            </article>
          )}
          {detail.images && detail.images.filter((img) => img.url).length > 0 && (
            <div className="post-detail-images">
                {detail.images
                  .filter((img) => img.url)
                  .map((image) => {
                    const imageSrc = resolveImageUrl(image.url, DEFAULT_AVATAR_URL)
                    return (
                      <figure key={image.imageId} onClick={() => setLightboxImage(imageSrc)}>
                        <img src={imageSrc} alt={`이미지 ${image.imageId}`} />
                      </figure>
                    )
                  })}
              </div>
            )}
            <article className="post-detail-content">{detail.content}</article>
          </section>
          <section className="comment-input-shell">
            <header>
              <strong>댓글 작성</strong>
              <span>{newComment.length}/500</span>
            </header>
            <textarea
              ref={commentInputRef}
              id="comment-content"
              name="content"
              className="comment-textarea"
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              maxLength={500}
            />
            <div className="comment-input-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={handleSubmitComment}
                disabled={commentSubmitting}
              >
                등록
              </button>
            </div>
          </section>
          <section className="post-detail-comments">
            <header>
              <strong>댓글 ({displayedCommentCount})</strong>
              <p>최대 20개씩, 오래된 순</p>
            </header>
            <div className="comment-list">
              {comments.length === 0 && <p className="post-status">댓글이 없습니다.</p>}
              {comments.map((comment) => (
                <article key={comment.commentId} className="comment-card">
                  <div className="comment-author">
                    <img
                      src={resolveImageUrl(comment.authorProfileImageUrl, DEFAULT_AVATAR_URL)}
                      alt={`${comment.authorNickname} 프로필`}
                    />
                    <div>
                      <strong>{comment.authorNickname}</strong>
                      <span>{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                    {comment.deletable && (
                      <button
                        type="button"
                        className="text-link danger"
                        onClick={() => setCommentToDelete(comment)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </article>
              ))}
              {hasMoreComments && (
                <div ref={commentSentinelRef} className="comment-sentinel" aria-hidden="true" />
              )}
            </div>
            {commentsLoading && <p className="post-status">댓글 로딩 중…</p>}
            {!hasMoreComments && comments.length > 0 && (
              <p className="post-status">마지막 댓글입니다.</p>
            )}
          </section>
        </>
      )}
      {postDeleteModal && (
        <Modal
          open
          title="게시글 삭제"
          message="게시글을 삭제하면 복구할 수 없습니다. 계속하시겠습니까?"
          danger
          confirmLabel="삭제"
          cancelLabel="취소"
          onConfirm={handleDeletePost}
          onCancel={() => setPostDeleteModal(false)}
        />
      )}
      {commentToDelete && (
        <Modal
          open
          title="댓글 삭제"
          message="해당 댓글을 삭제하시겠습니까?"
          danger
          confirmLabel="삭제"
          cancelLabel="취소"
          onConfirm={handleDeleteComment}
          onCancel={() => setCommentToDelete(null)}
        />
      )}
      {lightboxImage && (
        <div className="image-lightbox" role="dialog" aria-modal="true">
          <button type="button" className="image-lightbox__close" onClick={handleCloseLightbox}>
            ✕
          </button>
          <img src={lightboxImage} alt="게시물 사진 확대" />
        </div>
      )}
    </main>
  )
}
