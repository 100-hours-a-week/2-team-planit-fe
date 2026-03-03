import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { DEFAULT_PLAN_THUMBNAIL_URL } from '../constants/plan'
import { resolveImageUrl } from '../utils/image.ts'
import { getPosts } from '../api/posts'
import type { PostListItem, SortParam } from '../api/posts'
import { useAuth } from '../store'
import { createPortal } from 'react-dom'

const BOARD_TYPES = ['자유 게시판', '일정 공유', '장소 추천'] as const
const BOARD_TYPE_PARAM_MAP: Record<BoardType, string> = {
  '자유 게시판': 'FREE',
  '일정 공유': 'PLAN_SHARE',
  '장소 추천': 'PLACE_RECOMMEND',
}

const BOARD_TYPE_LABEL_BY_PARAM: Record<string, BoardType> = {
  FREE: '자유 게시판',
  PLAN_SHARE: '일정 공유',
  PLACE_RECOMMEND: '장소 추천',
}

const CITY_CATEGORIES = [
  {
    country: 'taiwan',
    label: '대만',
    cities: [
      { label: '타이베이', value: 'Taipei' },
      { label: '가오슝', value: 'Kaohsiung' },
    ],
  },
  {
    country: 'usa',
    label: '미국',
    cities: [
      { label: '괌', value: 'Guam' },
      { label: '사이판', value: 'Saipan' },
    ],
  },
  {
    country: 'japan',
    label: '일본',
    cities: [
      { label: '도쿄', value: 'Tokyo' },
      { label: '오사카', value: 'Osaka' },
      { label: '삿포로', value: 'Sapporo' },
      { label: '오키나와', value: 'Okinawa' },
      { label: '후쿠오카', value: 'Fukuoka' },
      { label: '나고야', value: 'Nagoya' },
    ],
  },
  {
    country: 'vietnam',
    label: '베트남',
    cities: [
      { label: '하노이', value: 'Hanoi' },
      { label: '다낭', value: 'Da Nang' },
      { label: '나트랑', value: 'Nha Trang' },
      { label: '푸꾸옥', value: 'Phu Quoc' },
    ],
  },
  {
    country: 'italy',
    label: '이탈리아',
    cities: [{ label: '로마', value: 'Rome' }],
  },
  {
    country: 'uk',
    label: '영국',
    cities: [{ label: '런던', value: 'London' }],
  },
  {
    country: 'philippines',
    label: '필리핀',
    cities: [
      { label: '마닐라', value: 'Manila' },
      { label: '세부', value: 'Cebu' },
      { label: '보라카이', value: 'Boracay' },
      { label: '보홀', value: 'Bohol' },
    ],
  },
  {
    country: 'china',
    label: '중국',
    cities: [
      { label: '홍콩', value: 'Hong Kong' },
      { label: '상하이', value: 'Shanghai' },
      { label: '마카오', value: 'Macau' },
    ],
  },
  {
    country: 'spain',
    label: '스페인',
    cities: [{ label: '바르셀로나', value: 'Barcelona' }],
  },
  {
    country: 'thailand',
    label: '태국',
    cities: [
      { label: '방콕', value: 'Bangkok' },
      { label: '치앙마이', value: 'Chiang Mai' },
    ],
  },
  {
    country: 'malaysia',
    label: '말레이시아',
    cities: [
      { label: '코타키나발루', value: 'Kota Kinabalu' },
      { label: '쿠알라룸푸르', value: 'Kuala Lumpur' },
    ],
  },
  {
    country: 'singapore',
    label: '싱가포르',
    cities: [{ label: '싱가포르', value: 'Singapore' }],
  },
  {
    country: 'france',
    label: '프랑스',
    cities: [{ label: '파리', value: 'Paris' }],
  },
] as const

type CityOption = (typeof CITY_CATEGORIES)[number]['cities'][number]
type CountryKey = (typeof CITY_CATEGORIES)[number]['country']
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

const ScrollTopButton = () => {
  if (typeof document === 'undefined') {
    return null
  }
  return createPortal(
    <button type="button" className="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      맨 위로
    </button>,
    document.body,
  )
}

export default function PostListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialSearchParams = new URLSearchParams(location.search)
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
  const initialCountryParam = initialSearchParams.get('country')
  const initialCityParam = initialSearchParams.get('city')
  const [selectedCountry, setSelectedCountry] = useState<CountryKey | ''>((initialCountryParam as CountryKey) ?? '')
  const [selectedCity, setSelectedCity] = useState(initialCityParam ?? '')

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    const currentReload = reloadTimeout.current
    const currentNavigate = navigateTimeout.current
    return () => {
      if (currentReload) {
        window.clearTimeout(currentReload)
      }
      if (currentNavigate) {
        window.clearTimeout(currentNavigate)
      }
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.key])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedParam = params.get('boardType')
    if (!requestedParam) {
      return
    }
    const mappedBoard = BOARD_TYPE_LABEL_BY_PARAM[requestedParam]
    if (mappedBoard && mappedBoard !== boardType) {
      setBoardType(mappedBoard)
    }
  }, [location.search, boardType])

  useEffect(() => {
    setPosts([])
    setHasMore(false)
    setError('')
    setPage(0)
  }, [boardType, sortOption, searchQuery, selectedCity, location.key])

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
        const cityFilter = boardType === '장소 추천' ? selectedCity || undefined : undefined
        const response = await getPosts({
          boardType: BOARD_TYPE_PARAM_MAP[boardType],
          sort: sortOption,
          search: searchQuery || undefined,
          city: cityFilter,
          page,
          size: PAGE_SIZE,
        })
        if (cancelled) {
          return
        }
        setPosts((prev) => (page === 0 ? response.items : [...prev, ...response.items]))
        setHasMore(Boolean(response.hasNext))
      } catch {
        if (cancelled) {
          return
        }
        setError('게시물을 불러오는 데 실패했습니다.')
      } finally {
        if (!cancelled) {
          if (page === 0) {
            setIsLoading(false)
          } else {
            setIsLoadingMore(false)
          }
        }
      }
    }

    fetchPosts()
    return () => {
      cancelled = true
    }
  }, [boardType, sortOption, searchQuery, page, selectedCity, location.key])

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

  const buildListParams = (overrides: {
    boardType?: BoardType
    sort?: SortParam
    country?: string | null
    city?: string | null
  }) => {
    const params = new URLSearchParams(location.search)
    const targetBoard = overrides.boardType ?? boardType
    params.set('boardType', BOARD_TYPE_PARAM_MAP[targetBoard])
    const targetSort = overrides.sort ?? sortOption
    params.set('sort', targetSort)
    const countryParam =
      overrides.country !== undefined ? overrides.country : selectedCountry || null
    if (targetBoard === '장소 추천' && countryParam) {
      params.set('country', countryParam)
    } else {
      params.delete('country')
    }
    const cityParam = overrides.city !== undefined ? overrides.city : selectedCity || null
    if (targetBoard === '장소 추천' && cityParam) {
      params.set('city', cityParam)
    } else {
      params.delete('city')
    }
    return params
  }

  const syncListSearch = (overrides: {
    boardType?: BoardType
    sort?: SortParam
    country?: string | null
    city?: string | null
  }) => {
    const params = buildListParams(overrides)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SortParam
    setSortOption(value)
    syncListSearch({ sort: value })
  }

  const handleBoardTabClick = (type: BoardType) => {
    setBoardType(type)
    syncListSearch({ boardType: type, country: null, city: null })
  }

  const currentCityOptions: readonly CityOption[] = selectedCountry
    ? CITY_CATEGORIES.find((entry) => entry.country === selectedCountry)?.cities ?? []
    : []

  const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = (event.target.value as CountryKey | '') || null
    setSelectedCountry(value ?? '')
    setSelectedCity('')
    syncListSearch({ country: value, city: null })
  }

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value || null
    setSelectedCity(value ?? '')
    syncListSearch({ city: value })
  }

  useEffect(() => {
    if (boardType !== '장소 추천') {
      setSelectedCountry('')
      setSelectedCity('')
    }
  }, [boardType])

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

  const normalized = (value?: string | null) => value?.toLowerCase() ?? ''
  const filteredPosts = useMemo(() => {
    if (boardType !== '장소 추천') {
      return posts
    }
    if (!selectedCountry && !selectedCity) {
      return posts
    }
    const normalizedCity = selectedCity ? selectedCity.toLowerCase() : ''
    const countryCityValues = CITY_CATEGORIES.find((entry) => entry.country === selectedCountry)?.cities.map((city) =>
      city.value.toLowerCase(),
    )
    return posts.filter((post) => {
      const placeName = normalized(post.placeName)
      if (selectedCity) {
        return placeName.includes(normalizedCity)
      }
      if (countryCityValues && countryCityValues.length) {
        return countryCityValues.some((cityValue) => placeName.includes(cityValue))
      }
      return true
    })
  }, [posts, boardType, selectedCountry, selectedCity])

  const isSearchActive = Boolean(searchQuery)
  const hasFetchedPosts = posts.length > 0
  const hasDisplayedPosts = filteredPosts.length > 0
  const hasLocationFilter = boardType === '장소 추천' && (selectedCountry || selectedCity)
  const emptyMessage = hasLocationFilter
    ? '선택한 여행지 카테고리에 맞는 게시물이 없습니다.'
    : isSearchActive
    ? '검색 결과가 없습니다.'
    : '게시글이 존재하지 않습니다.'

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
        {boardType === '장소 추천' && (
          <div className="city-filter">
            <label>
              <span className="sr-only">나라 선택</span>
              <select value={selectedCountry} onChange={handleCountryChange}>
                <option value="">전체 국가</option>
                {CITY_CATEGORIES.map((category) => (
                  <option key={category.country} value={category.country}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">도시 선택</span>
              <select value={selectedCity} onChange={handleCityChange} disabled={!currentCityOptions.length}>
                <option value="">모든 도시</option>
                {currentCityOptions.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
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

      {isLoading && !hasFetchedPosts ? (
        <p className="post-status">게시물 가져오는 중</p>
      ) : !hasDisplayedPosts ? (
        <p className="post-status">{emptyMessage}</p>
      ) : (
        <>
          <section className="post-grid" aria-live="polite">
            {filteredPosts.map((post) => (
              <article
                key={post.postId}
                className="post-card"
                onClick={() => navigate(`/posts/${post.postId}`)}
              >
                {(() => {
                  const isPlaceRecommendBoard = boardType === '장소 추천'
                  const isPlanShare = boardType === '일정 공유'
                  const placeImage = isPlaceRecommendBoard
                    ? post.placeImageUrl ?? post.representativeImageUrl
                    : undefined
                  const planImage = isPlanShare
                    ? post.planThumbnailImageUrl ?? DEFAULT_PLAN_THUMBNAIL_URL
                    : undefined
                  const representativeImage =
                    !isPlaceRecommendBoard && !isPlanShare ? post.representativeImageUrl : undefined
                  const imageUrl = placeImage ?? planImage ?? representativeImage
                  const shouldShowImage = Boolean(imageUrl)
                  const backgroundStyle = shouldShowImage ? { backgroundImage: `url(${imageUrl})` } : undefined
                  return (
                    <div
                      className={`post-card__media ${
                        shouldShowImage ? 'has-image' : 'no-image'
                      }`}
                      style={backgroundStyle}
                    >
                      {!shouldShowImage && <span className="post-card__placeholder-text">PLANIT</span>}
                    </div>
                  )
                })()}
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
                      src={resolveImageUrl(post.authorProfileImageUrl, DEFAULT_AVATAR_URL)}
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
          {(isLoadingMore || isLoading) && hasFetchedPosts && (
            <p className="post-status">게시물 가져오는 중</p>
          )}
          {!hasMore && hasFetchedPosts && (
            <p className="post-status">더 이상 불러올 게시물이 없습니다.</p>
          )}
        </>
      )}
      <ScrollTopButton />
    </main>
  )
}
