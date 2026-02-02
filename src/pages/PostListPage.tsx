import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { getPosts } from '../api/posts'
import type { PostListItem, SortParam } from '../api/posts'
import { useAuth } from '../store'

const BOARD_TYPES = ['자유 게시판', '일정 공유', '장소 추천'] as const
const PAGE_SIZE = 10

const SORT_OPTIONS: { label: string; value: SortParam }[] = [
  { label: '최신순', value: 'latest' },
  { label: '댓글순', value: 'comment' },
  { label: '좋아요순', value: 'like' },
]

const formatCount = (value: number) => {
  if (value >= 10000) {
    return `${Math.floor(value / 1000)}0k`
  }
  if (value >= 1000) {
    return `${Math.floor(value / 1000)}k`
  }
  return `${value}`
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

type BoardType = (typeof BOARD_TYPES)[number]

export default function PostListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [posts, setPosts] = useState<PostListItem[]>([])
  const [boardType, setBoardType] = useState<BoardType>(BOARD_TYPES[0])
  const [sortOption, setSortOption] = useState<SortParam>('latest')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [searchError, setSearchError] = useState('')
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const reloadTimeout = useRef<number | null>(null)
  const navigateTimeout = useRef<number | null>(null)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      if (reloadTimeout.current) {
        window.clearTimeout(reloadTimeout.current)
      }
      if (navigateTimeout.current) {
        window.clearTimeout(navigateTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    setPosts([])
    setHasMore(false)
    setError('')
    setPage(0)
  }, [boardType, sortOption, searchQuery])

  useEffect(() => {
    let cancelled = false

    const fetchPosts = async () => {
      setError('')
      if (page === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const response = await getPosts({
          boardType,
          sort: sortOption,
          search: searchQuery || undefined,
          page,
          size: PAGE_SIZE,
        })
        if (cancelled) {
          return
        }
        setPosts((prev) => (page === 0 ? response.posts : [...prev, ...response.posts]))
        setHasMore(response.hasMore)
      } catch {
        if (cancelled) {
          return
        }
        setError('게시물을 불러오는 데 실패했습니다.')
      } finally {
        if (cancelled) {
          return
        }
        if (page === 0) {
          setIsLoading(false)
        } else {
          setIsLoadingMore(false)
        }
      }
    }

    fetchPosts()
    return () => {
      cancelled = true
    }
  }, [boardType, sortOption, searchQuery, page])

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: '120px' },
    )
    const current = sentinelRef.current
    if (current) {
      observer.observe(current)
    }
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore])

  const validateSearchTerm = (value: string): string => {
    if (!value) {
      return ''
    }
    if (value.length < 2) {
      return '*최소 2글자 부터 검색 가능합니다.'
    }
    if (value.length > 24) {
      return '*최대 24자까지 검색 가능합니다.'
    }
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(value)) {
      return '*올바른 검색어를 입력해주세요'
    }
    if (!/^[가-힣a-zA-Z0-9\s]+$/.test(value)) {
      return '*특수문자는 입력 불가합니다'
    }
    return ''
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) {
      setSearchQuery('')
      setSearchError('')
      return
    }
    const validationMessage = validateSearchTerm(trimmed)
    if (validationMessage) {
      setSearchError(validationMessage)
      return
    }
    setSearchError('')
    setSearchQuery(trimmed)
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    if (searchError) {
      setSearchError('')
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchQuery('')
    setSearchError('')
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value as SortParam)
  }

  const handleBoardTabClick = (type: BoardType) => {
    if (type !== '자유 게시판') {
      showToast('v1 미구현 기능')
      reloadTimeout.current = window.setTimeout(() => {
        window.location.reload()
      }, 1800)
      return
    }
    setBoardType(type)
  }

  const handleWritePost = () => {
    if (!user) {
      showToast('로그인이 필요합니다')
      navigateTimeout.current = window.setTimeout(() => {
        navigate('/login')
      }, 1800)
      return
    }
    navigate('/posts/create')
  }

  const handleBackToHome = () => {
    navigate('/home')
  }

  const isSearchActive = Boolean(searchQuery)
  const hasPosts = posts.length > 0

  return (
    <main className="post-list-shell">
      <header className="post-list-header">
        <div className="post-header-top">
          <button type="button" className="action-button secondary" onClick={handleBackToHome}>
            뒤로가기
          </button>
          <div>
            <p className="post-list-tag">커뮤니티</p>
            <h1>게시물</h1>
          </div>
          <button type="button" className="action-button primary" onClick={handleWritePost}>
            글 쓰기
          </button>
        </div>
        <div className="board-tabs">
          {BOARD_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`board-tab ${boardType === type ? 'active' : ''}`}
              onClick={() => handleBoardTabClick(type)}
              aria-pressed={boardType === type}
            >
              {type}
            </button>
          ))}
        </div>
        <section className="post-toolbar">
          <form className="post-search" onSubmit={handleSearchSubmit}>
            <label htmlFor="post-search-input" className="sr-only">
              제목 또는 내용 검색
            </label>
            <input
              id="post-search-input"
              type="text"
              placeholder="제목·내용으로 검색"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="post-search__actions">
              <button type="submit" className="primary">
                검색
              </button>
              {searchQuery && (
                <button type="button" className="ghost" onClick={handleClearSearch}>
                  전체보기
                </button>
              )}
            </div>
            {searchError && <p className="post-search__error">{searchError}</p>}
          </form>
          <div className="post-sort">
            <label htmlFor="sort-select" className="sr-only">
              정렬 옵션
            </label>
            <select id="sort-select" value={sortOption} onChange={handleSortChange}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      </header>

      {toastInfo && (
        <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />
      )}

      {error && <p className="post-status post-status--error">{error}</p>}

      {isLoading && !hasPosts ? (
        <p className="post-status">게시물 가져오는 중</p>
      ) : !hasPosts ? (
        <p className="post-status">
          {isSearchActive ? '검색 결과가 없습니다.' : '게시글이 존재하지 않습니다.'}
        </p>
      ) : (
        <>
          <section className="post-grid" aria-live="polite">
            {posts.map((post) => (
              <article
                key={post.postId}
                className="post-card"
                onClick={() => navigate(`/posts/${post.postId}`)}
              >
                <div className="post-card__media">
                  <span>{post.placeName ?? post.tripTitle ?? 'Planit'}</span>
                </div>
                <div className="post-card__body">
                  <div className="post-card__header">
                    <span className="post-card__board">{boardType}</span>
                    {typeof post.rankingScore === 'number' && (
                      <span className="post-card__ranking">
                        랭킹 {post.rankingScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h2>{post.title}</h2>
                  <div className="post-card__meta">
                    {post.tripTitle && <span>여행: {post.tripTitle}</span>}
                    {post.placeName && <span>장소: {post.placeName}</span>}
                  </div>
                  <div className="post-card__stats">
                    <span>👍 {formatCount(post.likeCount)}</span>
                    <span>💬 {formatCount(post.commentCount)}</span>
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </div>
                  <div className="post-card__author">
                    <img
                      src={post.authorProfileImageUrl ?? DEFAULT_AVATAR_URL}
                      alt={`${post.authorNickname} 프로필`}
                    />
                    <div>
                      <strong>{post.authorNickname}</strong>
                      <p>By {post.authorNickname}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <div ref={sentinelRef} className="post-load-sentinel" aria-hidden="true" />
          {(isLoadingMore || isLoading) && hasPosts && (
            <p className="post-status">게시물 가져오는 중</p>
          )}
          {!hasMore && hasPosts && (
            <p className="post-status">더 이상 불러올 게시물이 없습니다.</p>
          )}
        </>
      )}
    </main>
  )
}
