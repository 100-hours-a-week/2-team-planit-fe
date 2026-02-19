import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, deletePostImageByKey, getPostPresignedUrl } from '../api/posts'
import type { CreatePostPayload } from '../api/posts'
import Toast from '../components/Toast'
import { fetchTrips } from '../api/trips'
import type { TripListItem } from '../api/trips'

const BOARD_OPTIONS = [
  { value: 'FREE', label: '자유게시판', description: '여행 경험과 사진을 자유롭게 공유해보세요.' },
  { value: 'PLAN_SHARE', label: '일정 공유', description: '내 일정 하나를 선택하여 요약해서 공유합니다.' },
  { value: 'PLACE_RECOMMEND', label: '장소 추천', description: '장소 검색과 별점으로 추천 정보를 알려주세요.' },
] as const

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type BoardValue = (typeof BOARD_OPTIONS)[number]['value'] | ''

type GooglePlaceInfo = {
  place_id?: string
  name?: string
  formatted_address?: string
}

type GoogleAutocomplete = {
  getPlace: () => GooglePlaceInfo
  addListener: (event: string, handler: () => void) => { remove: () => void }
}

type WindowWithGoogle = Window & typeof globalThis & {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (input: HTMLInputElement, options: { fields: string[] }) => GoogleAutocomplete
      }
    }
  }
}

type PlaceSuggestion = {
  placeId: number
  name: string
  city: string
}

const PLACE_SUGGESTIONS: PlaceSuggestion[] = [
  { placeId: 201, name: '가오슝', city: '타이완 · 가오슝' },
  { placeId: 202, name: '괌', city: '미국 · 괌' },
  { placeId: 203, name: '나고야', city: '일본 · 나고야' },
  { placeId: 204, name: '나트랑', city: '베트남 · 나트랑' },
  { placeId: 205, name: '다낭', city: '베트남 · 다낭' },
  { placeId: 206, name: '도쿄', city: '일본 · 도쿄' },
  { placeId: 207, name: '런던', city: '영국 · 런던' },
  { placeId: 208, name: '로마', city: '이탈리아 · 로마' },
  { placeId: 209, name: '마닐라', city: '필리핀 · 마닐라' },
  { placeId: 210, name: '마카오', city: '중국 · 마카오' },
  { placeId: 211, name: '바르셀로나', city: '스페인 · 바르셀로나' },
  { placeId: 212, name: '방콕', city: '태국 · 방콕' },
  { placeId: 213, name: '보라카이', city: '필리핀 · 보라카이' },
  { placeId: 214, name: '보홀', city: '필리핀 · 보홀' },
  { placeId: 215, name: '사이판', city: '미국 · 사이판' },
  { placeId: 216, name: '상하이', city: '중국 · 상하이' },
  { placeId: 217, name: '세부', city: '필리핀 · 세부' },
  { placeId: 218, name: '싱가포르', city: '싱가포르 · 싱가포르' },
  { placeId: 219, name: '오사카', city: '일본 · 오사카' },
  { placeId: 220, name: '오키나와', city: '일본 · 오키나와' },
  { placeId: 221, name: '파리', city: '프랑스 · 파리' },
  { placeId: 222, name: '푸꾸옥', city: '베트남 · 푸꾸옥' },
  { placeId: 223, name: '하노이', city: '베트남 · 하노이' },
  { placeId: 224, name: '홍콩', city: '홍콩 · 홍콩' },
  { placeId: 225, name: '후쿠오카', city: '일본 · 후쿠오카' },
]

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
  const [locationQuery, setLocationQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<PlaceSuggestion | null>(null)
  const [rating, setRating] = useState(0)
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [autocompleteReady, setAutocompleteReady] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
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
      setLocationQuery('')
      setRating(0)
      setGooglePlaceId('')
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
    if (!inputRef.current) {
      return
    }
    if (typeof window === 'undefined') {
      return
    }
    const hasGoogle = (window as WindowWithGoogle).google
    if (hasGoogle?.maps?.places) {
      setAutocompleteReady(true)
      return
    }
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places]')
    if (existing) {
      existing.addEventListener('load', () => setAutocompleteReady(true))
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.googlePlaces = 'true'
    script.onload = () => setAutocompleteReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!autocompleteReady || !inputRef.current) {
      return
    }
    const google = (window as WindowWithGoogle).google
    if (!google?.maps?.places) {
      return
    }
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'name', 'formatted_address'],
    })
      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.place_id) {
          return
        }
        setSelectedLocation({
          placeId: Number(place.place_id.replace(/\D/g, '')) || 0,
          name: place.name ?? '',
          city: place.formatted_address ?? '',
        })
        setGooglePlaceId(place.place_id)
        if (place.name) {
          setTitle(place.name)
          setLocationQuery(place.name)
        }
      })
    return () => {
      listener.remove()
    }
  }, [autocompleteReady])

  const filteredPlaces = useMemo(() => {
    const query = locationQuery.trim().toLowerCase()
    if (!query) {
      return PLACE_SUGGESTIONS
    }
    return PLACE_SUGGESTIONS.filter(
      (item) => item.name.toLowerCase().includes(query) || item.city.toLowerCase().includes(query),
    )
  }, [locationQuery])

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

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setSelectedLocation(place)
    setTitle(place.name)
    setGooglePlaceId(String(place.placeId))
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
      placeName: boardType === 'PLACE_RECOMMEND' && selectedLocation ? selectedLocation.name : undefined,
      rating: boardType === 'PLACE_RECOMMEND' ? rating : undefined,
      googlePlaceId: boardType === 'PLACE_RECOMMEND' ? googlePlaceId || undefined : undefined,
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
            onChange={(event) => setTitle(event.target.value.slice(0, 24))}
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
            <label>위치 검색</label>
            <input
              type="text"
              ref={inputRef}
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="위치를 검색하세요"
            />
            <div className="location-suggestions">
              {filteredPlaces.map((place) => (
                <button type="button" key={place.placeId} onClick={() => handleSelectPlace(place)}>
                  <span className="location-name">{place.name}</span>
                  <span className="location-city">{place.city}</span>
                </button>
              ))}
            </div>
            {selectedLocation && <p className="selected-location">선택 장소: {selectedLocation.name}</p>}
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
      {toastInfo && <Toast message={toastInfo.message} key={toastInfo.key} onClose={() => setToastInfo(null)} />}
    </main>
  )
}
