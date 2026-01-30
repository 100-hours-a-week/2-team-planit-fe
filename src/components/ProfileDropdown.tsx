import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { User } from '../store'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  user: User | null
  onNavigateLogin: () => void
  onNavigateSignup: () => void
  onNavigateMyPage: () => void
  onLogout: () => void
}

export default function ProfileDropdown({
  open,
  anchorRef,
  onClose,
  user,
  onNavigateLogin,
  onNavigateSignup,
  onNavigateMyPage,
  onLogout,
}: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose, anchorRef])

  if (!open) {
    return null
  }

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <div className="profile-dropdown-header">
        <div className="profile-avatar header-avatar">
          <img
            src={user?.profileImageUrl ?? DEFAULT_AVATAR_URL}
            alt={user?.loginId ? `${user.loginId} 프로필` : 'PlanIt 기본 아바타'}
          />
        </div>
        <p className="profile-name">{user?.nickname ?? 'PlanIt 이용자'}</p>
      </div>
      <div className="profile-dropdown-actions">
        {user ? (
          <>
            <button type="button" className="profile-dropdown-item" onClick={onNavigateMyPage}>
              마이페이지
            </button>
            <button type="button" className="profile-dropdown-item danger" onClick={onLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <button type="button" className="profile-dropdown-item" onClick={onNavigateLogin}>
              로그인
            </button>
            <button type="button" className="profile-dropdown-item" onClick={onNavigateSignup}>
              회원가입
            </button>
          </>
        )}
      </div>
    </div>
  )
}
