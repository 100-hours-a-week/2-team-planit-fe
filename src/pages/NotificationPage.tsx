import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import {
  getNotifications,
  markNotificationRead,
  markNotificationsReadAll,
} from '../api/notifications'
import type { NotificationItem, NotificationType } from '../api/notifications'
import { useAuth } from '../store'

const TYPE_LABELS: Record<NotificationType, string> = {
  KEYWORD: '키워드',
  COMMENT: '댓글',
  LIKE: '좋아요',
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

export default function NotificationPage() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0),
    [notifications],
  )

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
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
        if (cancelled) {
          return
        }
        setNotifications(result.notifications)
        setNextCursor(result.nextCursor ?? null)
      } catch {
        if (!cancelled) {
          setError('알림을 불러오는 데 실패했습니다.')
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
      setNotifications((prev) => [...prev, ...result.notifications])
      setNextCursor(result.nextCursor ?? null)
    } catch {
      showToast('추가 알림을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, nextCursor])

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
      } catch {
        showToast('알림을 읽음 처리하는 데 실패했습니다.')
      } finally {
        setMarkingId(null)
      }
    }
    navigate(`/posts/${item.postId}`)
  }

  const handleMarkAllRead = async () => {
    if (!unreadCount || markAllLoading) {
      return
    }
    setMarkAllLoading(true)
    try {
      await markNotificationsReadAll()
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
      showToast('모든 알림을 읽음 처리했습니다.')
    } catch {
      showToast('전체 알림을 읽음 처리하는 중 오류가 발생했습니다.')
    } finally {
      setMarkAllLoading(false)
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
          {notifications.length > 0 && (
            <button
              type="button"
              className="notification-mark-all"
              onClick={handleMarkAllRead}
              disabled={!unreadCount || markAllLoading}
            >
              {markAllLoading ? '처리 중…' : '전체 읽음'}
            </button>
          )}
          <div className="notification-icon" aria-label="읽지 않은 알림">
            🔔
            {unreadCount > 0 && <span className="notification-icon__badge">{unreadCount}</span>}
          </div>
        </div>
      </header>

      {toastInfo && (
        <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />
      )}

      {loading ? (
        <p className="notification-status">알림 가져오는 중</p>
      ) : error ? (
        <p className="notification-status notification-status--error">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="notification-status">*아직 알림이 없어요</p>
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
              <p className="notification-card__text">“{notification.previewText}”</p>
              {!notification.isRead && <span className="notification-card__unread-pill">새 알림</span>}
            </article>
          ))}
          <div ref={sentinelRef} className="notification-sentinel" aria-hidden="true" />
        </section>
      )}
      {(loadingMore || (nextCursor !== null && notifications.length > 0)) && (
        <p className="notification-status">알림 더 불러오는 중…</p>
      )}
    </main>
  )
}
