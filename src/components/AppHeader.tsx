import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileDropdown from './ProfileDropdown'
import { getMyPage } from '../api/users'
import { useAuth } from '../store'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { resolveImageUrl } from '../utils/image.ts'

export default function AppHeader() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuth()
  const loggedIn = Boolean(user)
  const profileAvatarSrc = resolveImageUrl(user?.profileImageUrl, DEFAULT_AVATAR_URL)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  const fetchNotificationCount = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!loggedIn) {
        setNotificationCount(0)
        return
      }
      try {
        const result = await getMyPage()
        if (!isCancelled()) {
          setNotificationCount(result.notificationCount ?? 0)
        }
      } catch {
        if (!isCancelled()) {
          setNotificationCount(0)
        }
      }
    },
    [loggedIn],
  )

  useEffect(() => {
    if (!loggedIn) {
      const timer = window.setTimeout(() => {
        setNotificationCount(0)
      }, 0)
      return () => {
        window.clearTimeout(timer)
      }
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      fetchNotificationCount(() => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [fetchNotificationCount, loggedIn])

  useEffect(() => {
    const handleUnreadBadgeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }> | undefined)?.detail
      if (detail === undefined) {
        fetchNotificationCount()
        return
      }
      setNotificationCount(detail.count ?? 0)
    }
    window.addEventListener('notifications:unread-count', handleUnreadBadgeUpdate)
    return () => {
      window.removeEventListener('notifications:unread-count', handleUnreadBadgeUpdate)
    }
  }, [fetchNotificationCount])

  const handleNotificationClick = () => {
    navigate('/notifications')
  }

  const handleNavigateLogin = () => {
    setDropdownOpen(false)
    navigate('/login')
  }

  const handleNavigateSignup = () => {
    setDropdownOpen(false)
    navigate('/signup')
  }

  const handleNavigateMyPage = () => {
    setDropdownOpen(false)
    navigate('/mypage')
  }

  const handleLogout = () => {
    clearAuth()
    setNotificationCount(0)
    setDropdownOpen(false)
    navigate('/login')
  }

  const hasUnreadNotification = notificationCount > 0
  const notificationLabel =
    hasUnreadNotification && (notificationCount > 99 ? '99+' : `${notificationCount}`)

  return (
    <header className="app-header">
      <h1 className="logo-title">
        <button type="button" className="logo-button" onClick={() => window.location.reload()}>
          PlanIt
        </button>
      </h1>
      <div className="header-actions">
        <button type="button" className="notification-button" onClick={handleNotificationClick}>
          <span className="sr-only">알림함</span>
          <span aria-hidden="true">🔔</span>
          {notificationLabel && (
            <span className="notification-count" aria-hidden="true">
              {notificationLabel}
            </span>
          )}
        </button>
        <div className="profile-wrapper">
          <button
            type="button"
            ref={profileButtonRef}
            className="profile-trigger"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <div className="profile-avatar">
              <img
                src={profileAvatarSrc}
                alt={loggedIn && user ? `${user.loginId} 프로필` : 'PlanIt 기본 아바타'}
              />
            </div>
          </button>
          <ProfileDropdown
            open={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            anchorRef={profileButtonRef}
            user={user}
            onNavigateLogin={handleNavigateLogin}
            onNavigateSignup={handleNavigateSignup}
            onNavigateMyPage={handleNavigateMyPage}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  )
}
