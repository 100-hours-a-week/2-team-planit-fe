import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { useAuth } from '../store'
import { getPosts } from '../api/posts'
import type { PostListItem } from '../api/posts'

type BoardType = '일정 공유' | '장소 추천' | '자유 게시판'

type TravelSeed = {
  id: string
  city: string
  country: string
  image: string
}

const BOARD_TYPES: BoardType[] = ['일정 공유', '장소 추천', '자유 게시판']

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

const RECENT_POST_PARAMS = {
  sort: 'latest' as const,
  page: 0,
  size: 3,
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
  const { user } = useAuth()
  const loggedIn = Boolean(user)
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType>('자유 게시판')
  const toastKeyRef = useRef(0)

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

  const recommendations = useMemo(() => shuffle(TRAVEL_RECOMMENDATIONS).slice(0, 5), [])
  const [recentPosts, setRecentPosts] = useState<PostListItem[]>([])
  const [isRecentLoading, setIsRecentLoading] = useState(true)
  const [recentFetchFailed, setRecentFetchFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchRecentPosts = async () => {
      setIsRecentLoading(true)
      setRecentFetchFailed(false)
      try {
        const response = await getPosts({
          ...RECENT_POST_PARAMS,
          boardType: selectedBoardType,
        })
        if (cancelled) {
          return
        }
        setRecentPosts(response.posts)
      } catch {
        if (cancelled) {
          return
        }
        setRecentPosts([])
        setRecentFetchFailed(true)
      } finally {
        if (!cancelled) {
          setIsRecentLoading(false)
        }
      }
    }

    fetchRecentPosts()
    return () => {
      cancelled = true
    }
  }, [selectedBoardType])

  return (
    <main className="home-shell">
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
              내 계획 보기
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
            {isRecentLoading ? (
              <p className="board-status">게시물을 불러오는 중입니다...</p>
            ) : recentPosts.length > 0 ? (
              recentPosts.map((post) => (
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
                    <span className="board-tag">{selectedBoardType}</span>
                    <span className="board-date">{formatTimeAgo(post.createdAt)}</span>
                  </div>
                  <h4>{truncateText(post.title, 11)}</h4>
                  <p>{truncateText(post.placeName ?? post.tripTitle ?? 'PlanIt 커뮤니티', 20)}</p>
                  <div className="board-meta">
                    <span>좋아요 {formatCount(post.likeCount)}</span>
                    <span>댓글 {formatCount(post.commentCount)}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="board-status">
                {recentFetchFailed ? '게시물을 불러오지 못했습니다.' : '게시물이 없습니다.'}
              </p>
            )}
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
