import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileDropdown from '../components/ProfileDropdown'
import Toast from '../components/Toast'
import { getMyPage } from '../api/users'
import { useAuth } from '../store'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { resolveImageUrl } from '../utils/image.ts'

type BoardType = '일정 공유' | '장소 추천' | '자유 게시판'

type BoardPost = {
  postId: number
  boardType: BoardType
  title: string
  content: string
  likeCount: number
  commentCount: number
  createdAt: string
}

type TravelSeed = {
  id: string
  city: string
  country: string
  image: string
}

const BOARD_TYPES: BoardType[] = ['일정 공유', '장소 추천', '자유 게시판']

const BOARD_POSTS: BoardPost[] = [
  {
    postId: 401,
    boardType: '자유 게시판',
    title: '한라산이 보여준 겨울의 시간표',
    content: '산행 루트부터 온천, 숙소까지 하루 스케줄을 공유합니다',
    likeCount: 1280,
    commentCount: 62,
    createdAt: '2026-01-30T09:10:00.000Z',
  },
  {
    postId: 402,
    boardType: '자유 게시판',
    title: '강릉 커피 기행 후기',
    content: '기차를 타고 내려가는 동안 커피집 5곳을 돌았어요.',
    likeCount: 860,
    commentCount: 14,
    createdAt: '2026-01-29T15:23:00.000Z',
  },
  {
    postId: 403,
    boardType: '자유 게시판',
    title: '서울 근교 캠핑 조합',
    content: '데이트, 가족, 친구별로 추천하는 캠핑장 리스트입니다.',
    likeCount: 430,
    commentCount: 9,
    createdAt: '2026-01-28T21:40:00.000Z',
  },
  {
    postId: 404,
    boardType: '자유 게시판',
    title: '한강 피크닉 장비',
    content: '돗자리부터 전기버너까지 실물 후기 남겨요.',
    likeCount: 1080,
    commentCount: 22,
    createdAt: '2026-01-27T18:10:00.000Z',
  },
  {
    postId: 405,
    boardType: '자유 게시판',
    title: '간사이 3박4일 기록',
    content: '지하철 패스, 식사, 쇼핑 포인트를 시간대 별로 정리했습니다.',
    likeCount: 980,
    commentCount: 31,
    createdAt: '2026-01-26T11:05:00.000Z',
  },
]

const LOGIN_TOAST_MESSAGE = '로그인 후 이용 가능한 서비스입니다.'
const BOARD_UNSUPPORTED_TOAST = 'v1에서는 자유 게시판만 지원합니다.'

const BASE_TRAVEL_DESTINATIONS = [
  {
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Rome',
    country: 'Italy',
    image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad92?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Seoul',
    country: 'Korea',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Kyoto',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    image: 'https://images.unsplash.com/photo-1508898578281-774ac4893b9f?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Santorini',
    country: 'Greece',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Vancouver',
    country: 'Canada',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Queenstown',
    country: 'New Zealand',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Cusco',
    country: 'Peru',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
  },
  {
    city: 'Barcelona',
    country: 'Spain',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=80',
  },
]

const TRAVEL_RECOMMENDATIONS: TravelSeed[] = Array.from({ length: 30 }, (_, index) => {
  const template = BASE_TRAVEL_DESTINATIONS[index % BASE_TRAVEL_DESTINATIONS.length]
  return {
    id: `travel-${index + 1}`,
    city: template.city,
    country: template.country,
    image: template.image,
  }
})

const shuffle = <T,>(list: T[]): T[] => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const formatCount = (value: number) => {
  if (value >= 10000) {
    return `${Math.floor(value / 1000)}0k`
  }
  if (value >= 1000) {
    return `${Math.floor(value / 1000)}k`
  }
  return `${value}`
}

const formatTimeAgo = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMinutes = Math.max(Math.floor(diffMs / (1000 * 60)), 1)
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

const truncateText = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit)}...` : text)

export default function HomePage() {
  const navigate = useNavigate()
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const { user, clearAuth } = useAuth()
  const loggedIn = Boolean(user)
  const profileAvatarSrc = resolveImageUrl(user?.profileImageUrl, DEFAULT_AVATAR_URL)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false)
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType>('자유 게시판')
  const toastKeyRef = useRef(0)

  const fetchNotificationCount = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!loggedIn) {
        setHasUnreadNotification(false)
        return
      }
      try {
        const result = await getMyPage()
        if (!isCancelled()) {
          setHasUnreadNotification(result.notificationCount > 0)
        }
      } catch {
        if (!isCancelled()) {
          setHasUnreadNotification(false)
        }
      }
    },
    [loggedIn],
  )

  useEffect(() => {
    if (!loggedIn) {
      const timer = window.setTimeout(() => {
        setHasUnreadNotification(false)
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
      setHasUnreadNotification(detail.count > 0)
    }
    window.addEventListener('notifications:unread-count', handleUnreadBadgeUpdate)
    return () => {
      window.removeEventListener('notifications:unread-count', handleUnreadBadgeUpdate)
    }
  }, [fetchNotificationCount])

  const showToast = (message: string) => {
    toastKeyRef.current += 1
    setToastInfo({ message, key: toastKeyRef.current })
  }

  const showLoginToast = () => {
    showToast(LOGIN_TOAST_MESSAGE)
  }

  const showUnsupportedToast = () => {
    showToast(BOARD_UNSUPPORTED_TOAST)
  }

  const handleNotificationClick = () => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    navigate('/notifications')
  }

  const handleSoloPlan = () => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    navigate('/trips/new')
  }

  const handleViewMyPlans = () => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    navigate('/mypage')
  }

  const handleTogetherPlan = () => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    showUnsupportedToast()
  }

  const handleViewAll = () => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    navigate('/posts')
  }

  const handleBoardTypeClick = (type: BoardType) => {
    if (type !== '자유 게시판') {
      showUnsupportedToast()
      return
    }
    setSelectedBoardType(type)
  }

  const handlePostClick = (postId: number) => {
    if (!loggedIn) {
      showLoginToast()
      return
    }
    navigate(`/posts/${postId}`)
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
    setHasUnreadNotification(false)
    setDropdownOpen(false)
    navigate('/login')
  }

  const sortedBoardPosts = useMemo(() => {
    return [...BOARD_POSTS]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((post) => post.boardType === selectedBoardType)
      .slice(0, 3)
  }, [selectedBoardType])

  const recommendations = useMemo(() => shuffle(TRAVEL_RECOMMENDATIONS).slice(0, 5), [])

  return (
    <main className="home-shell">
      <header className="home-header">
        <h1 className="logo-title">
          <button type="button" className="logo-button" onClick={() => window.location.reload()}>
            PlanIt
          </button>
        </h1>
        <div className="header-actions">
          <button type="button" className="notification-button" onClick={handleNotificationClick}>
          <span className="sr-only">알림함</span>
          <span aria-hidden="true">🔔</span>
          {hasUnreadNotification && <span className="notification-dot" aria-hidden="true" />}
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

      <div className="home-content">
        <section className="launch-section">
          <div>
            <p className="eyebrow">PLAN YOUR NEXT MOVE</p>
            <h2>혼자서도 계획을 세울 수 있는 공간</h2>
            <p className="launch-description">
              여행 정보 입력부터 게시물 공유까지, PlanIt이 처음부터 끝까지 함께합니다. 아직 경험해보지 못한 내일을 오늘 정리해보세요.
            </p>
          </div>
          <div className="launch-actions">
            <button type="button" className="primary-btn" onClick={handleSoloPlan}>
              혼자 계획하기
            </button>
            <button type="button" className="secondary-btn" onClick={handleTogetherPlan}>
              같이 계획하기
            </button>
            <button type="button" className="secondary-btn" onClick={handleViewMyPlans}>
              내 일정 보기
            </button>
          </div>
        </section>

        <section className="community-section">
          <header className="section-header">
            <p className="section-label">커뮤니티</p>
            <h3>게시판 유형 선택</h3>
          </header>
          <div className="board-type-group">
            {BOARD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`board-type-button ${selectedBoardType === type ? 'active' : ''}`}
                onClick={() => handleBoardTypeClick(type)}
                aria-pressed={selectedBoardType === type}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="board-list">
            {sortedBoardPosts.map((post) => (
              <article
                key={post.postId}
                className="board-card"
                role="button"
                tabIndex={0}
                onClick={() => handlePostClick(post.postId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    handlePostClick(post.postId)
                  }
                }}
              >
                <div className="board-card-header">
                  <span className="board-tag">{post.boardType}</span>
                  <span className="board-date">{formatTimeAgo(post.createdAt)}</span>
                </div>
                <h4>{truncateText(post.title, 11)}</h4>
                <p>{truncateText(post.content, 15)}</p>
                <div className="board-meta">
                  <span>좋아요 {formatCount(post.likeCount)}</span>
                  <span>댓글 {formatCount(post.commentCount)}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="board-footer">
            <button type="button" className="text-link" onClick={handleViewAll}>
              전체 보기
            </button>
          </div>
        </section>

        <section className="travel-section">
          <header className="section-header">
            <p className="section-label">여행지 추천</p>
            <h3>PlanIt이 미리 준비한 여행 스팟</h3>
          </header>
          <div className="travel-carousel">
            {recommendations.map((item) => (
              <article key={item.id} className="travel-card">
                <div className="travel-image">
                  <img src={item.image} alt={`${item.city} ${item.country}`} />
                </div>
                <p className="travel-location">
                  {item.city} · {item.country}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {toastInfo && (
        <Toast
          key={toastInfo.key}
          message={toastInfo.message}
          duration={3000}
          onClose={() => setToastInfo(null)}
        />
      )}
    </main>
  )
}
