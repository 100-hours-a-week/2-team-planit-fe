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
import { DEFAULT_PLAN_THUMBNAIL_URL } from '../constants/plan'
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
const CONTENT_MAX_LENGTH = 1000

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
  const detailRef = useRef<PostDetail | null>(null)

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
  const [pendingHighlightId, setPendingHighlightId] = useState<number | null>(null)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  const fetchCommentPage = useCallback(
    async (pageNumber: number, replace = false, overridePostId?: number) => {
      const postId = overridePostId ?? detailRef.current?.postId
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
    [user],
  )

  const loadPostDetail = useCallback(
    async (options?: { signal?: { aborted: boolean }; suppressLoading?: boolean }) => {
      if (!id) {
        setDetail(null)
        detailRef.current = null
        setError('잘못된 게시글입니다.')
        setIsLoading(false)
        return
      }
      if (!options?.suppressLoading) {
        setIsLoading(true)
      }
      setError('')
      try {
        const response = await getPost(id)
        if (options?.signal?.aborted) {
          return
        }
        if (response.deleted) {
          detailRef.current = null
          setDetail(null)
          setError('삭제된 게시글입니다.')
          setIsLoading(false)
          return
        }
        setDetail(response)
        detailRef.current = response
        setLikeCount(response.likeCount)
        setLiked(response.likedByRequester)
        setComments([])
        setHasMoreComments(true)
        setCommentPage(0)
        await fetchCommentPage(0, true, response.postId)
      } catch {
        detailRef.current = null
        if (!options?.signal?.aborted) {
          setError('게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!options?.signal?.aborted && !options?.suppressLoading) {
          setIsLoading(false)
        }
      }
    },
    [fetchCommentPage, id],
  )

  useEffect(() => {
    const controller = { aborted: false }
    loadPostDetail({ signal: controller })
    return () => {
      controller.aborted = true
    }
  }, [loadPostDetail])

  const loadMoreComments = useCallback(() => {
    if (commentsLoading || !hasMoreComments) {
      return
    }
    fetchCommentPage(commentPage)
  }, [commentsLoading, commentPage, fetchCommentPage, hasMoreComments])

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
    setCommentSubmitting(true)
    try {
      const created = await createComment(detail.postId, { content: trimmed })
      setNewComment('')
      const textarea = commentInputRef.current
      if (textarea) {
        textarea.style.height = 'auto'
      }
      await loadPostDetail({ suppressLoading: true })
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
      navigate('/posts?boardType=PLAN_SHARE')
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
      await loadPostDetail({ suppressLoading: true })
    } catch {
      showToast('댓글 삭제에 실패했습니다.')
    }
  }

  const handlePlanCardClick = () => {
  if (!detail?.tripId) {
      return
    }
    navigate(`/trips/${detail.tripId}/itineraries?readonly=true`)
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
    const listener: EventListener = (event) => handleKeyDown(event as unknown as KeyboardEvent)

    window.addEventListener('keydown', listener)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', listener)
    }
  }, [lightboxImage])

  useEffect(() => {
    if (pendingHighlightId === null) {
      return
    }
    const target = document.getElementById(`comment-${pendingHighlightId}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setPendingHighlightId(null)
    }
  }, [pendingHighlightId, comments])

  useEffect(() => {
    detailRef.current = detail
  }, [detail])

  const totalCommentCount = detail?.commentCount ?? 0
  const isAuthor = detail?.author.authorId === user?.id

  return (
    <main className="post-detail-shell">
      <div className="post-detail-shell__header">
        <button
          className="post-detail-back"
          type="button"
          onClick={() => navigate('/posts')}
          aria-label="뒤로가기"
        >
          ← 뒤로가기
        </button>
        {detail && (
          <div className="post-detail-shell__board">
            <p className="post-detail-board__name">{detail.boardName}</p>
            <p className="post-detail-board__description">{detail.boardDescription}</p>
          </div>
        )}
      </div>
      {toastInfo && (
        <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />
      )}
      {isLoading && <p className="post-status">게시물 가져오는 중</p>}
      {!isLoading && error && <p className="post-status post-status--error">{error}</p>}
      {!isLoading && !error && detail && (
        <>
          <div className="post-detail-board">
            <p className="post-detail-board__name">{detail.boardName}</p>
            <p className="post-detail-board__description">{detail.boardDescription}</p>
          </div>
          <section className="post-detail-card">
            <header className="post-detail-header">
              <div className="post-detail-title-row">
                <h1 style={{ whiteSpace: 'pre-wrap' }}>{detail.title}</h1>
                <span className="post-detail-title-time" aria-label="작성 시간">
                  {formatTimeAgo(detail.createdAt)}
                </span>
              </div>
              <div className="post-detail-meta">
                <div className="post-detail-author">
                  <img
                    src={resolveImageUrl(detail.author.profileImageUrl, DEFAULT_AVATAR_URL)}
                    alt={`${detail.author.nickname} 프로필`}
                    onError={(event) => {
                      const target = event.currentTarget
                      target.onerror = null
                      target.src = DEFAULT_AVATAR_URL
                    }}
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
                    aria-pressed={liked}
                  >
                    좋아요 {likeCount}
                  </button>
                  <span className="post-detail-stats__separator" aria-live="polite">
                    댓글 {totalCommentCount}
                  </span>
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
            {detail.tripId && (
              <button
                type="button"
                className="plan-share-card"
                onClick={handlePlanCardClick}
                aria-label="공유된 일정 결과로 이동"
              >
                <div className="plan-share-card__image">
                  <img
                    src={
                      detail.planThumbnailUrl
                        ? resolveImageUrl(detail.planThumbnailUrl, DEFAULT_PLAN_THUMBNAIL_URL)
                        : DEFAULT_PLAN_THUMBNAIL_URL
                    }
                    alt={detail.tripTitle ? `${detail.tripTitle} 썸네일` : '공유된 일정 이미지'}
                    onError={(event) => {
                      const target = event.currentTarget
                      if (target.dataset.fallback === 'applied') return
                      target.dataset.fallback = 'applied'
                      target.src = DEFAULT_PLAN_THUMBNAIL_URL
                    }}
                  />
                </div>
                <div className="plan-share-card__body">
                  <p className="plan-share-card__label">공유된 일정</p>
                  <h2>{detail.tripTitle || '공유된 일정'}</h2>
                  <p className="plan-share-card__hint">일정 재생성과 채팅은 비활성화</p>
                </div>
                <div className="plan-share-card__cta">일정 결과 보기</div>
              </button>
            )}
            {detail.boardName === '장소 추천' ? (
              <>
                <header className="place-detail-header">
                  <div>
                    <p className="place-detail-header__label">장소 추천</p>
                    <p className="place-detail-header__desc">구글 맵스 기반 장소 정보를 확인하세요.</p>
                  </div>
                  <span className="place-detail-timestamp">{formatTimeAgo(detail.createdAt)}</span>
                </header>
                <article className="place-detail-card place-detail-card--flat">
                  <div
                    className="place-detail-image"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      detail.googlePlaceId &&
                      window.open(`https://www.google.com/maps/place/?q=place_id:${detail.googlePlaceId}`, '_blank')
                    }
                    onKeyDown={(event) => {
                      if (detail.googlePlaceId && (event.key === 'Enter' || event.key === ' ')) {
                        window.open(`https://www.google.com/maps/place/?q=place_id:${detail.googlePlaceId}`, '_blank')
                      }
                    }}
                  >
                    <img
                      src={
                        detail.placeImageUrl
                          ? resolveImageUrl(detail.placeImageUrl, DEFAULT_PLAN_THUMBNAIL_URL)
                          : DEFAULT_PLAN_THUMBNAIL_URL
                      }
                      alt={detail.placeName ? `${detail.placeName} 대표 이미지` : '장소 대표 이미지'}
                      onError={(event) => {
                        const target = event.currentTarget
                        if (target.dataset.fallback === 'applied') {
                          return
                        }
                        target.dataset.fallback = 'applied'
                        target.src = DEFAULT_PLAN_THUMBNAIL_URL
                      }}
                    />
                  </div>
                  <div className="place-detail-card__body">
                    <strong
                      className="place-detail-card__title"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        detail.googlePlaceId &&
                        window.open(`https://www.google.com/maps/place/?q=place_id:${detail.googlePlaceId}`, '_blank')
                      }
                      onKeyDown={(event) => {
                        if (detail.googlePlaceId && (event.key === 'Enter' || event.key === ' ')) {
                          window.open(`https://www.google.com/maps/place/?q=place_id:${detail.googlePlaceId}`, '_blank')
                        }
                      }}
                    >
                      {detail.placeName ?? '장소 정보'}
                    </strong>
                    <span className="place-detail-card__region">
                      {detail.city || detail.country
                        ? `${detail.city ?? '지역 정보 없음'} · ${detail.country ?? '지역 정보 없음'}`
                        : '지역 정보 없음'}
                    </span>
                    <div className="place-detail-meta">
                      <div
                        className="place-detail-stars"
                        aria-label={`평점 ${detail.userRating ?? detail.rating ?? 0}점`}
                      >
                        {Array.from({ length: 5 }, (_, index) => {
                          const ratingValue = detail.userRating ?? detail.rating ?? 0
                          return (
                            <span
                              key={index}
                              className={`place-detail-star${index < ratingValue ? ' place-detail-star--active' : ''}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                    <article className="post-detail-content">
                      {detail.content.slice(0, CONTENT_MAX_LENGTH)}
                      {detail.content.length > CONTENT_MAX_LENGTH && (
                        <p className="post-detail-content__limit">최대 1,000자까지 표시됩니다.</p>
                      )}
                    </article>
                  </div>
                </article>
              </>
            ) : (
              <>
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
                <article className="post-detail-content">
                  {detail.content.slice(0, CONTENT_MAX_LENGTH)}
                  {detail.content.length > CONTENT_MAX_LENGTH && (
                    <p className="post-detail-content__limit">최대 1,000자까지 표시됩니다.</p>
                  )}
                </article>
              </>
            )}
          </section>
          <section className="comment-input-shell">
            <header>
              <strong>댓글 작성</strong>
              <span>{newComment.length}/500자</span>
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
              <div>
                <strong>댓글 ({totalCommentCount})</strong>
                <p>최대 20개, 작성 시간 기준 오래된 순</p>
              </div>
            </header>
            <div className="comment-list">
              {comments.length === 0 && <p className="post-status">댓글이 없습니다.</p>}
              {comments.map((comment) => (
                <article key={comment.commentId} className="comment-card" id={`comment-${comment.commentId}`}>
                  <div className="comment-card__head">
                    <div className="comment-author">
                      <img
                        src={resolveImageUrl(comment.authorProfileImageUrl, DEFAULT_AVATAR_URL)}
                        alt={`${comment.authorNickname} 프로필`}
                      />
                      <div>
                        <strong>{comment.authorNickname}</strong>
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                    </div>
                    {comment.deletable && (
                      <button
                        type="button"
                        className="text-link danger comment-delete"
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
