import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { KEYWORD_SUBSCRIPTIONS_EVENT, loadPersistedKeywordSubscriptions, persistKeywordSubscriptions } from '../utils/keywordSubscriptions'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from '../api/notifications'
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationType,
} from '../api/notifications'
import { useAuth } from '../store'
import {
  fetchKeywordSubscriptions,
  createKeywordSubscription,
  deleteKeywordSubscription,
  type KeywordSubscription,
} from '../api/keywords'

const TYPE_LABELS: Record<NotificationType, string> = {
  KEYWORD: '키워드',
  COMMENT: '댓글',
  LIKE: '좋아요',
}

const TYPE_MESSAGES: Record<NotificationType, string> = {
  COMMENT: '“새 댓글이 달렸습니다.”',
  LIKE: '“좋아요를 받았습니다.”',
  KEYWORD: '키워드 연관 알림입니다.',
}

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

const normalizeNotificationsFromResponse = (response?: NotificationListResponse | null) => {
  if (!response) {
    return []
  }
  if (Array.isArray(response.notifications)) {
    return response.notifications
  }
  const alternativeFields = ['items', 'content']
  const responseRecord = response as unknown as Record<string, unknown>
  for (const field of alternativeFields) {
    const candidate = responseRecord[field]
    if (Array.isArray(candidate)) {
      return candidate as NotificationItem[]
    }
  }
  return []
}

const getTypeBadge = (type: NotificationType) => {
  switch (type) {
    case 'COMMENT':
      return '💬'
    case 'LIKE':
      return '👍'
    default:
      return '⭐'
  }
}

const getNotificationMessage = (notification: NotificationItem) => {
  return TYPE_MESSAGES[notification.type] ?? `“${notification.previewText}”`
}

export default function NotificationPage() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keywordModalOpen, setKeywordModalOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordError, setKeywordError] = useState('')
  const [subscriptions, setSubscriptions] = useState<KeywordSubscription[]>([])
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const safeNotifications = useMemo(() => notifications ?? [], [notifications])
  const unreadCount = useMemo(
    () => safeNotifications.reduce((count, item) => (item.isRead ? count : count + 1), 0),
    [safeNotifications],
  )

  const dispatchUnreadBadgeEvent = (count: number) => {
    if (typeof window === 'undefined') {
      return
    }
    const event = new CustomEvent('notifications:unread-count', {
      detail: { count },
    })
    window.dispatchEvent(event)
  }

  const refreshUnreadBadge = useCallback(async () => {
    try {
      const result = await getUnreadNotificationCount()
      dispatchUnreadBadgeEvent(result.unreadCount)
    } catch {
      // best effort only
    }
  }, [])

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  const validateKeyword = (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      return '최소 2글자 부터 검색 가능합니다.'
    }
    if (trimmed.length > 10) {
      return '최대 10자까지 검색 가능합니다.'
    }
    if (/[ㄱ-ㅎ]/.test(trimmed)) {
      return '올바른 검색어를 입력해주세요.'
    }
    if (!/^[가-힣a-zA-Z]+$/.test(trimmed)) {
      return '특수문자는 사용할 수 없습니다. 한국어 또는 영어만 입력해주세요.'
    }
    return ''
  }

  const loadKeywordSubscriptions = useCallback(async () => {
    try {
      const list = await fetchKeywordSubscriptions()
      setSubscriptions(list)
      persistKeywordSubscriptions(list)
    } catch {
      showToast('키워드를 불러오는 데 실패했습니다.')
    }
  }, [])

  const loadCachedKeywords = useCallback(() => {
    const cached = loadPersistedKeywordSubscriptions()
    if (cached) {
      setSubscriptions(cached)
    }
  }, [])

  useEffect(() => {
    loadCachedKeywords()
    loadKeywordSubscriptions()
  }, [loadCachedKeywords, loadKeywordSubscriptions])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {}
    }
    const handler = (event: Event) => {
      if (event instanceof CustomEvent && Array.isArray(event.detail)) {
        setSubscriptions(event.detail)
      }
    }
    window.addEventListener(KEYWORD_SUBSCRIPTIONS_EVENT, handler as EventListener)
    return () => window.removeEventListener(KEYWORD_SUBSCRIPTIONS_EVENT, handler as EventListener)
  }, [])

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setKeywordInput(event.target.value)
    if (keywordError) {
      setKeywordError('')
    }
  }

  const handleAddKeyword = async () => {
    const error = validateKeyword(keywordInput)
    if (error) {
      setKeywordError(error)
      return
    }
    try {
      await createKeywordSubscription(keywordInput.trim())
      setKeywordInput('')
      showToast('키워드가 등록되었습니다.')
      loadKeywordSubscriptions()
    } catch {
      setKeywordError('키워드 등록에 실패했습니다.')
    }
  }

  const handleDeleteKeyword = async (subscriptionId: number) => {
    try {
      await deleteKeywordSubscription(subscriptionId)
      showToast('키워드가 삭제되었습니다.')
      loadKeywordSubscriptions()
    } catch {
      showToast('키워드 삭제에 실패했습니다.')
    }
  }

  const handleKeywordModalClose = () => {
    setKeywordModalOpen(false)
    setKeywordInput('')
    setKeywordError('')
  }

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [navigate, user])

  useEffect(() => {
    let cancelled = false

    const fetchNotifications = async () => {
      setLoading(true)
      setError('')
      if (!accessToken) {
        setNotifications([])
        setNextCursor(null)
        setLoading(false)
        return
      }

      try {
        const result = await getNotifications()
        console.debug('notifications response', result)
        if (cancelled) {
          return
        }
        const safeList = normalizeNotificationsFromResponse(result)
        setNotifications(safeList)
        setNextCursor(result.nextCursor ?? null)
        const unreadFromResponse =
          typeof result.unreadCount === 'number'
            ? result.unreadCount
            : safeList.filter((item) => !item.isRead).length
        dispatchUnreadBadgeEvent(unreadFromResponse)
      } catch {
        if (!cancelled) {
          setError('알림을 불러오는 데 실패했습니다.')
          setNotifications([])
          setNextCursor(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchNotifications()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const loadMoreNotifications = useCallback(async () => {
    if (loadingMore || !nextCursor || !accessToken) {
      return
    }
    setLoadingMore(true)
    try {
      const result = await getNotifications({ cursor: nextCursor, size: 15 })
      const safeList = normalizeNotificationsFromResponse(result)
      console.debug('notifications page response', result)
      setNotifications((prev) => [...(prev ?? []), ...safeList])
      setNextCursor(result.nextCursor ?? null)
    } catch {
      showToast('추가 알림을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, nextCursor, accessToken])

  useEffect(() => {
    if (loadingMore || loading || !nextCursor) {
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreNotifications()
        }
      },
      { rootMargin: '120px' },
    )
    const current = sentinelRef.current
    if (current) {
      observer.observe(current)
    }
    return () => observer.disconnect()
  }, [loadingMore, loading, nextCursor, loadMoreNotifications, accessToken])

  const handleNotificationClick = async (item: NotificationItem) => {
    if (markingId !== null) {
      return
    }
    if (!item.isRead) {
      setMarkingId(item.notificationId)
      try {
        await markNotificationRead(item.notificationId)
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notificationId === item.notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      )
      refreshUnreadBadge()
    } catch {
      showToast('알림을 읽음 처리하는 데 실패했습니다.')
    } finally {
        setMarkingId(null)
      }
    }
    navigate(`/posts/${item.postId}`)
  }

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) {
      return
    }
    const targetIds = safeNotifications.filter((item) => !item.isRead).map((item) => item.notificationId)
    if (targetIds.length === 0) {
      return
    }
    setMarkingAll(true)
    try {
      await Promise.all(targetIds.map((id) => markNotificationRead(id)))
      setNotifications((prev) =>
        prev.map((notification) => (targetIds.includes(notification.notificationId) ? { ...notification, isRead: true } : notification)),
      )
      dispatchUnreadBadgeEvent(0)
      showToast('모든 알림을 읽음 처리했습니다.')
    } catch {
      showToast('전체 알림 읽음 처리에 실패했습니다.')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <main className="notification-shell">
      <header className="notification-header">
        <button type="button" className="notification-back" onClick={handleBack}>
          ← 뒤로가기
        </button>
        <div>
          <p className="notification-title">알림</p>
          <p className="notification-subtitle">새 소식과 활동 알림</p>
        </div>
        <div className="notification-header-actions">
          <button
            type="button"
            className="notification-mark-all"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAll}
          >
            전체 읽음
          </button>
          <div className="notification-icon" aria-label="읽지 않은 알림">
            🔔
            {unreadCount > 0 && <span className="notification-icon__badge">{unreadCount}</span>}
          </div>
        </div>
      </header>

      <section className="keyword-panel">
        <div className="keyword-panel__head">
          <div>
            <p className="keyword-panel__title">키워드 알림</p>
            <p className="keyword-panel__subtitle">관심 키워드가 포함된 게시물이 생기면 알려드려요</p>
          </div>
          <button
            type="button"
            className="keyword-panel__button"
            onClick={() => setKeywordModalOpen(true)}
          >
            키워드 설정
          </button>
        </div>
        <div className="keyword-panel__content">
          {subscriptions.length === 0 ? (
            <p className="keyword-panel__empty">등록된 키워드가 없습니다.</p>
          ) : (
            <div className="keyword-panel__chips">
              {subscriptions.map((subscription) => (
                <span className="keyword-chip" key={subscription.id}>
                  {subscription.keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {toastInfo && (
        <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />
      )}

      {loading ? (
        <p className="notification-status">알림 가져오는 중</p>
      ) : error ? (
        <p className="notification-status notification-status--error">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="notification-status">새 알림이 없습니다.</p>
      ) : (
        <section className="notification-list" aria-live="polite">
          {notifications.map((notification) => (
            <article
              key={notification.notificationId}
              className={`notification-card${notification.isRead ? '' : ' notification-card--unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-card__header">
                <span className="notification-card__badge">{getTypeBadge(notification.type)}</span>
                <div>
                  <p className="notification-card__type">
                    {notification.actorName ? `${notification.actorName} · ` : ''}
                    {TYPE_LABELS[notification.type]} 알림
                  </p>
                  <p className="notification-card__timestamp">{formatTimeAgo(notification.createdAt)}</p>
                </div>
              </div>
                  <p className="notification-card__text">{getNotificationMessage(notification)}</p>
              {!notification.isRead && <span className="notification-card__unread-pill">새 알림</span>}
            </article>
          ))}
          <div ref={sentinelRef} className="notification-sentinel" aria-hidden="true" />
        </section>
      )}
      {(loadingMore || (nextCursor !== null && notifications.length > 0)) && (
        <p className="notification-status">알림 더 불러오는 중…</p>
      )}
      <Modal
        open={keywordModalOpen}
        title="키워드 알림 설정"
        onConfirm={handleKeywordModalClose}
        confirmLabel="닫기"
        message={
          <div className="keyword-modal">
            <p className="keyword-modal__description">
              키워드 알림은 제목이나 본문에 해당 키워드가 등장할 때 알림을 보냅니다.
            </p>
            <div className="keyword-modal__input">
              <label htmlFor="keyword-input" className="sr-only">키워드</label>
              <input
                id="keyword-input"
                type="text"
                value={keywordInput}
                onChange={handleKeywordChange}
                placeholder="예: 제주도"
              />
              <button type="button" className="primary-btn" onClick={handleAddKeyword}>
                등록
              </button>
            </div>
            {keywordError && <p className="keyword-modal__error">{keywordError}</p>}
            <ul className="keyword-modal__list">
              {subscriptions.length === 0 ? (
                <li className="keyword-modal__empty">등록된 키워드가 없습니다.</li>
              ) : (
                subscriptions.map((subscription) => (
                  <li key={subscription.id} className="keyword-modal__item">
                    <span>{subscription.keyword}</span>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleDeleteKeyword(subscription.id)}
                    >
                      삭제
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        }
      />
    </main>
  )
}
