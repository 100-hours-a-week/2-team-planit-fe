import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, deletePostImageByKey, getPostPresignedUrl } from '../api/posts'
import type { CreatePostPayload } from '../api/posts'
import Toast from '../components/Toast'
import { fetchTrips } from '../api/trips'
import type { TripListItem } from '../api/trips'
import type { PlaceSearchResult } from '../api/placeRecommendations'
import { searchPlaceRecommendations } from '../api/placeRecommendations'

const BOARD_OPTIONS = [
  { value: 'FREE', label: '자유게시판', description: '여행 경험과 사진을 자유롭게 공유해보세요.' },
  { value: 'PLAN_SHARE', label: '일정 공유', description: '내 일정 하나를 선택하여 요약해서 공유합니다.' },
  { value: 'PLACE_RECOMMEND', label: '장소 추천', description: '장소 검색과 별점으로 추천 정보를 알려주세요.' },
] as const

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type BoardValue = (typeof BOARD_OPTIONS)[number]['value'] | ''


function getFileExtension(file: File): string {
  const segments = file.name.toLowerCase().split('.')
  const ext = segments.length > 1 ? segments.pop()! : ''
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
}

export default function PostCreatePage() {
  const navigate = useNavigate()
  const [boardType, setBoardType] = useState<BoardValue>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<TripListItem | null>(null)
  const [trips, setTrips] = useState<TripListItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<PlaceSearchResult | null>(null)
  const [rating, setRating] = useState(0)
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imageFiles])

  useEffect(() => {
    if (boardType !== 'PLAN_SHARE') {
      setSelectedSchedule(null)
    }
    if (boardType !== 'PLACE_RECOMMEND') {
      setSelectedLocation(null)
      setRating(0)
      setTitleTouched(false)
      setPlaceSearchOpen(false)
    }
  }, [boardType])

  useEffect(() => {
    if (boardType !== 'PLAN_SHARE' || trips.length > 0) {
      return
    }
    const loadTrips = async () => {
      try {
        const data = await fetchTrips()
        setTrips(data)
      } catch {
        showToast('여행 일정을 불러오지 못했습니다.')
      }
    }
    loadTrips()
  }, [boardType, trips.length])

  const validation = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!boardType) {
      errors.boardType = '*게시판 유형을 선택해주세요.'
    }
    if (!title.trim() || !content.trim()) {
      errors.title = '*제목, 내용을 모두 작성해주세요.'
      errors.content = '*제목, 내용을 모두 작성해주세요.'
    } else {
      if (title.length > 24) {
        errors.title = '*제목은 최대 24자까지 가능합니다.'
      }
      if (content.length > 2000) {
        errors.content = '*내용은 최대 2,000자까지 작성 가능합니다.'
      }
    }
    if (boardType === 'PLAN_SHARE' && !selectedSchedule) {
      errors.schedule = '*일정을 선택해주세요.'
    }
    if (boardType === 'PLACE_RECOMMEND') {
      if (!selectedLocation) {
        errors.location = '*위치를 선택해주세요.'
      }
      if (!rating) {
        errors.rating = '*별점을 선택해주세요.'
      }
    }
    return { errors, valid: Object.keys(errors).length === 0 }
  }, [boardType, title, content, selectedSchedule, selectedLocation, rating])

  useEffect(() => {
    if (!placeSearchOpen) {
      setSearchResults([])
      setSearchError('')
      return
    }
    if (!searchTerm.trim()) {
      setSearchResults([])
      setSearchError('')
      return
    }
    const handler = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const results = await searchPlaceRecommendations(searchTerm.trim())
        setSearchResults(results)
      } catch {
        setSearchError('장소 검색에 실패했습니다.')
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => {
      window.clearTimeout(handler)
    }
  }, [searchTerm, placeSearchOpen])

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_IMAGE_SIZE) {
        showToast('이미지는 최대 5MB까지 허용됩니다.')
        continue
      }
      valid.push(file)
    }
    const remaining = MAX_IMAGES - imageFiles.length
    const toUpload = valid.slice(0, remaining)
    if (!toUpload.length) {
      return
    }
    if (valid.length > toUpload.length) {
      showToast('이미지는 최대 5장까지 업로드 가능합니다.')
    }
    for (const file of toUpload) {
      try {
        const { uploadUrl, key } = await getPostPresignedUrl(getFileExtension(file), file.type || 'image/jpeg')
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: await file.arrayBuffer(),
          redirect: 'manual',
        })
        if (!response.ok) {
          throw new Error('업로드 실패')
        }
        setImageFiles((prev) => [...prev, file])
        setImageKeys((prev) => [...prev, key])
      } catch {
        showToast('이미지 업로드에 실패했습니다.')
      }
    }
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    const keyToDelete = imageKeys[index]
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index))
    setImageKeys((prev) => prev.filter((_, idx) => idx !== index))
    if (keyToDelete) {
      deletePostImageByKey(keyToDelete).catch(() => {})
    }
  }

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.slice(0, 24)
    setTitle(nextValue)
    setTitleTouched(true)
  }

  const openPlaceSearch = () => {
    setSearchTerm(selectedLocation?.name ?? '')
    setSearchError('')
    setPlaceSearchOpen(true)
  }

  const closePlaceSearch = () => {
    setPlaceSearchOpen(false)
    setSearchTerm('')
    setSearchResults([])
    setSearchError('')
  }

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSelectedLocation(place)
    if (!titleTouched) {
      setTitle(place.name)
    }
    closePlaceSearch()
  }

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validation.valid) {
      showToast('*모든 필수 항목을 채운 후 등록해주세요.')
      return
    }
    setIsSubmitting(true)
    const payload: CreatePostPayload = {
      boardType: boardType as BoardValue,
      title: title.trim(),
      content: content.trim(),
      imageKeys: boardType === 'FREE' && imageKeys.length ? imageKeys : undefined,
      planId: boardType === 'PLAN_SHARE' && selectedSchedule ? selectedSchedule.tripId : undefined,
      placeId: boardType === 'PLACE_RECOMMEND' && selectedLocation ? selectedLocation.placeId : undefined,
      placeName: boardType === 'PLACE_RECOMMEND' && selectedLocation ? selectedLocation.name : undefined,
      rating: boardType === 'PLACE_RECOMMEND' ? rating : undefined,
      googlePlaceId:
        boardType === 'PLACE_RECOMMEND' && selectedLocation?.googlePlaceId
          ? selectedLocation.googlePlaceId
          : undefined,
    }
    try {
      const result = await createPost(payload)
      navigate(`/posts/${result.postId}`)
    } catch {
      showToast('게시글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const boardDescription =
    BOARD_OPTIONS.find((option) => option.value === boardType)?.description || '게시판 유형을 선택해주세요.'

  return (
    <main className="post-create-shell">
      <header className="post-create-header">
        <h1>게시글 작성</h1>
        <p>{boardDescription}</p>
      </header>
      <form className="post-create-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="board-select">게시판 유형</label>
          <select
            id="board-select"
            value={boardType}
            onChange={(event) => setBoardType(event.target.value as BoardValue)}
            className={boardType ? 'accented' : ''}
          >
            <option value="">선택하세요</option>
            {BOARD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {validation.errors.boardType && <p className="form-error">{validation.errors.boardType}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="post-title">제목</label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            maxLength={24}
            placeholder="제목을 입력하세요 (최대 24자)"
          />
          <p className="form-hint">{`${title.length}/24`}</p>
          {validation.errors.title && <p className="form-error">{validation.errors.title}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="post-content">본문</label>
          <textarea
            id="post-content"
            rows={6}
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 2000))}
            maxLength={2000}
            placeholder="내용을 상세히 작성해주세요."
          />
          <p className="form-hint">{`${content.length}/2000`}</p>
          {validation.errors.content && <p className="form-error">{validation.errors.content}</p>}
        </div>

        {boardType === 'FREE' && (
          <div className="form-group">
            <label>이미지 첨부 (최대 5장, 5MB 이하)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} />
            {previews.length > 0 && (
              <div className="post-create-images">
                {previews.map((src, idx) => (
                  <div key={`${src}-${idx}`} className="post-create-image-item">
                    <img src={src} alt={`선택한 이미지 ${idx + 1}`} />
                    <button
                      type="button"
                      className="post-create-image-remove"
                      onClick={() => handleRemoveImage(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {boardType === 'PLAN_SHARE' && (
          <div className="form-group">
            <label>일정 선택</label>
            <button type="button" className="secondary-btn" onClick={() => setScheduleModalOpen(true)}>
              일정 선택하기
            </button>
        {selectedSchedule && (
          <div className="schedule-summary">
            <strong>{selectedSchedule.title}</strong>
            <p>
              {selectedSchedule.startDate} ~ {selectedSchedule.endDate}
            </p>
            <p>{selectedSchedule.travelCity}</p>
          </div>
        )}
            {validation.errors.schedule && <p className="form-error">{validation.errors.schedule}</p>}
          </div>
        )}

        {boardType === 'PLACE_RECOMMEND' && (
          <div className="form-group">
            <label htmlFor="place-search-input">장소 검색</label>
            <div className="place-search-input-wrapper">
              <input
                id="place-search-input"
                type="text"
                readOnly
                value={selectedLocation?.name ?? ''}
                placeholder="장소를 검색하려면 클릭하세요"
                onClick={openPlaceSearch}
              />
              <button type="button" className="secondary-btn" onClick={openPlaceSearch}>
                검색
              </button>
            </div>
            {selectedLocation && (
              <p className="selected-location">
                {selectedLocation.name} · {selectedLocation.city}
              </p>
            )}
            {validation.errors.location && <p className="form-error">{validation.errors.location}</p>}
            <div className="rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={value <= rating ? 'active' : ''}
                  onClick={() => setRating(value)}
                >
                  ★
                </button>
              ))}
            </div>
            {validation.errors.rating && <p className="form-error">{validation.errors.rating}</p>}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/posts')}>
            취소
          </button>
          <button type="submit" className="primary-btn" disabled={!validation.valid || isSubmitting}>
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>

      {scheduleModalOpen && (
        <div className="schedule-picker">
          <div className="schedule-picker__overlay" onClick={() => setScheduleModalOpen(false)} />
          <div className="schedule-picker__content">
            <header>
              <strong>일정 선택</strong>
              <button type="button" onClick={() => setScheduleModalOpen(false)}>
                ×
              </button>
            </header>
            <ul>
              {trips.map((trip) => (
                <li key={trip.tripId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchedule(trip)
                      setScheduleModalOpen(false)
                    }}
                  >
                    <strong>{trip.title}</strong>
                    <span>
                      {trip.startDate} ~ {trip.endDate}
                    </span>
                    <p>{trip.travelCity}</p>
                  </button>
                </li>
              ))}
              {trips.length === 0 && (
                <li>
                  <p>작성된 일정이 없습니다.</p>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
      {placeSearchOpen && (
        <div className="place-search-modal">
          <div className="place-search-modal__overlay" onClick={closePlaceSearch} />
          <div className="place-search-modal__content">
            <header>
              <strong>장소 검색</strong>
              <button type="button" onClick={closePlaceSearch}>
                ×
              </button>
            </header>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="장소 이름 또는 지역을 입력하세요"
              autoFocus
            />
            {searchLoading && <p className="place-search-modal__status">검색 중...</p>}
            {searchError && <p className="place-search-modal__error">{searchError}</p>}
            {!searchLoading && !searchError && searchResults.length === 0 && searchTerm && (
              <p className="place-search-modal__status">검색 결과가 없습니다.</p>
            )}
            <ul>
              {searchResults.map((place) => (
                <li key={place.placeId}>
                  <button type="button" onClick={() => handleSelectPlace(place)}>
                    <strong>{place.name}</strong>
                    <span>{place.city}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {toastInfo && <Toast message={toastInfo.message} key={toastInfo.key} onClose={() => setToastInfo(null)} />}
    </main>
  )
}
