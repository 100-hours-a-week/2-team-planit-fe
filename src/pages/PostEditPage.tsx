import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import PlaceSearchModal from '../components/PlaceSearchModal'
import { deletePostImageByKey, getPost, getPostPresignedUrl, updatePost } from '../api/posts'
import type { PostDetail } from '../api/posts'
import type { PlaceSearchResult } from '../api/placeRecommendations'
import { useAuth } from '../store'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { resolveImageUrl } from '../utils/image'
import { fetchTrips } from '../api/trips'
import type { TripListItem } from '../api/trips'

const BOARD_OPTIONS = [
  { value: 'FREE', label: '자유게시판', description: '여행 경험과 사진을 자유롭게 공유해보세요.' },
  { value: 'PLAN_SHARE', label: '일정 공유', description: '내 일정 하나를 선택하여 요약하여 공유합니다.' },
  { value: 'PLACE_RECOMMEND', label: '장소 추천', description: '추천 장소 정보와 별점을 공유합니다.' },
] as const
const BOARD_DESCRIPTION = '여행과 장소 정보를 자유롭게 공유해보세요.'
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

function getFileExtension(file: File): string {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop()! : ''
  return ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number]) ? ext : 'jpg'
}

export default function PostEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [detail, setDetail] = useState<PostDetail | null>(null)
  const [boardType, setBoardType] = useState<string>('FREE')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([])
  const [trips, setTrips] = useState<TripListItem[]>([])
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<TripListItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string; schedule?: string; location?: string; rating?: string }>({})
  const [selectedLocation, setSelectedLocation] = useState<PlaceSearchResult | null>(null)
  const [rating, setRating] = useState(0)
  const [placeModalOpen, setPlaceModalOpen] = useState(false)
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)
  const [removedKeys, setRemovedKeys] = useState<string[]>([])

  const isAuthor = Boolean(detail && user && detail.author.authorId === user.id)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  useEffect(() => {
    const postId = Number(id)
    if (!id || Number.isNaN(postId)) {
      setError('잘못된 게시글입니다.')
      setIsLoading(false)
      return
    }
    let cancelled = false
    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const response = await getPost(String(postId))
        if (cancelled) {
          return
        }
        setDetail(response)
        const mappedType =
          response.boardType ||
          (response.boardName?.includes('일정 공유')
            ? 'PLAN_SHARE'
            : response.boardName?.includes('장소 추천')
              ? 'PLACE_RECOMMEND'
              : 'FREE')
        setBoardType(mappedType)
        setTitle(response.title)
        setContent(response.content)
        const keys = (response.images ?? [])
          .map((img) => img.key)
          .filter((k): k is string => Boolean(k))
        setImageKeys(keys)
      } catch {
        if (!cancelled) {
          setError('게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (boardType !== 'PLAN_SHARE' || trips.length > 0) {
      return
    }
    let cancelled = false
    const loadTrips = async () => {
      try {
        const data = await fetchTrips()
        if (!cancelled) {
          setTrips(data)
        }
      } catch {
        showToast('여행 일정을 불러오지 못했습니다.')
      }
    }
    loadTrips()
    return () => {
      cancelled = true
    }
  }, [boardType, trips.length])

  useEffect(() => {
    if (boardType !== 'PLAN_SHARE' || !detail) {
      return
    }
    if (selectedSchedule && selectedSchedule.tripId === detail.planId) {
      return
    }
    const match = trips.find((trip) => trip.tripId === detail.planId)
    if (match) {
      setSelectedSchedule(match)
      return
    }
    if (detail.planId) {
      setSelectedSchedule({
        tripId: detail.planId,
        title: detail.planTitle ?? '선택된 일정',
        startDate: detail.planStartDate ?? '',
        endDate: detail.planEndDate ?? '',
        travelCity: '',
      })
    }
  }, [boardType, detail, trips, selectedSchedule])

  useEffect(() => {
    if (!detail) {
      return
    }
    const mappedType =
      detail.boardType ||
      (detail.boardName?.includes('일정 공유')
        ? 'PLAN_SHARE'
        : detail.boardName?.includes('장소 추천')
          ? 'PLACE_RECOMMEND'
          : 'FREE')
    setBoardType(mappedType)
    if (mappedType === 'PLACE_RECOMMEND') {
      setSelectedLocation(
        detail.placeName
          ? {
              name: detail.placeName,
              addressText: detail.placeName,
              city: detail.placeName,
              googlePlaceId: detail.googlePlaceId ?? '',
            }
          : null,
      )
      setRating(detail.userRating ?? detail.rating ?? 0)
    }
  }, [detail, detail?.boardType, detail?.boardName, detail?.placeName])

  useEffect(() => {
    if (boardType !== 'PLAN_SHARE') {
      setSelectedSchedule(null)
      setScheduleModalOpen(false)
    }
    if (boardType !== 'PLACE_RECOMMEND') {
      setSelectedLocation(null)
      setRating(0)
    }
  }, [boardType])

  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file))
    setNewFilePreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [newFiles])

  const validate = () => {
    const nextErrors: typeof errors = {}
    if (!title.trim()) {
      nextErrors.title = '*제목을 입력해주세요.'
    } else if (title.length > 24) {
      nextErrors.title = '*제목은 최대 24자까지 가능합니다.'
    }
    if (!content.trim()) {
      nextErrors.content = '*내용을 입력해주세요.'
    } else if (content.length > 2000) {
      nextErrors.content = '*내용은 최대 2,000자까지 작성 가능합니다.'
    }
    if (boardType === 'PLAN_SHARE' && !selectedSchedule) {
      nextErrors.schedule = '*일정을 선택해주세요.'
    }
    if (boardType === 'PLACE_RECOMMEND') {
      if (!selectedLocation) {
        nextErrors.location = '*위치를 선택해주세요.'
      }
      if (!rating) {
        nextErrors.rating = '*별점을 선택해주세요.'
      }
      if (selectedLocation && !selectedLocation.googlePlaceId) {
        nextErrors.location = '*유효한 장소를 선택해주세요.'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    const selected = Array.from(files).filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast('이미지 크기는 최대 5MB까지 허용됩니다.')
        return false
      }
      return true
    })
    const total = imageKeys.length + newFiles.length
    const toAdd = selected.slice(0, Math.max(0, 5 - total))
    event.target.value = ''
    for (const file of toAdd) {
      try {
        const ext = getFileExtension(file)
        const { uploadUrl, key } = await getPostPresignedUrl(ext, file.type || 'image/jpeg')
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: await file.arrayBuffer(),
          redirect: 'manual',
        })
        if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
          const location = response.headers.get('Location') || '(none)'
          console.error('S3 redirect detected', response.status, location)
          throw new Error(`S3 리다이렉트 발생. 버킷 리전이 ap-northeast-2인지 확인하세요. Location: ${location}`)
        }
        if (!response.ok) {
          const body = await response.text()
          console.error('S3 PUT failed', response.status, body)
          throw new Error(body || '업로드 실패')
        }
        setNewFiles((prev) => [...prev, file])
        setImageKeys((prev) => [...prev, key])
      } catch {
        showToast('이미지 업로드에 실패했습니다.')
      }
    }
  }

  const trackRemovedKey = (key?: string) => {
    if (!key) {
      return
    }
    setRemovedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }

  const handleRemoveExistingImage = (index: number) => {
    if (index < 0) {
      return
    }
    const keyToDelete = imageKeys[index]
    setImageKeys((prev) => prev.filter((_, idx) => idx !== index))
    trackRemovedKey(keyToDelete)
  }

  const handleRemoveNewImage = (index: number) => {
    const existingCount = imageKeys.length - newFiles.length
    const keyToDelete = imageKeys[existingCount + index]
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index))
    setImageKeys((prev) => prev.filter((_, idx) => idx !== existingCount + index))
    trackRemovedKey(keyToDelete)
  }

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSelectedLocation(place)
    if (place.name) {
      setTitle(place.name)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail) {
      showToast('게시글 정보를 가져오지 못했습니다.')
      return
    }
    if (!isAuthor) {
      showToast('게시글 작성자만 수정할 수 있습니다.')
      return
    }
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const payload: Parameters<typeof updatePost>[1] = {
        title: title.trim(),
        content: content.trim(),
        imageKeys: boardType === 'FREE' && imageKeys.length > 0 ? imageKeys : undefined,
      }
      if (boardType === 'PLAN_SHARE' && selectedSchedule) {
        payload.planId = selectedSchedule.tripId
      }
      if (boardType === 'PLACE_RECOMMEND' && selectedLocation) {
        payload.placeName = selectedLocation.name
        payload.userRating = rating
        if (selectedLocation.googlePlaceId) {
          payload.googlePlaceId = selectedLocation.googlePlaceId
        }
      }
      const result = await updatePost(String(detail.postId), payload)
      if (removedKeys.length > 0) {
        try {
          await Promise.all(removedKeys.map((key) => deletePostImageByKey(key)))
        } catch {
          showToast('이미지 삭제에 실패했습니다.')
        }
      }
      navigate(`/posts/${result.postId}`)
    } catch {
      showToast('게시글 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentHint = useMemo(() => `${content.length}/2000`, [content.length])
  const isFormValid = Boolean(title.trim() && content.trim())

  return (
    <main className="post-create-shell">
      <header className="post-create-header">
        <h1>게시글 수정</h1>
        <p>{BOARD_DESCRIPTION}</p>
      </header>
      {isLoading && <p className="post-status">게시글 정보를 불러오는 중...</p>}
      {error && <p className="post-status post-status--error">{error}</p>}
      {!isLoading && !error && detail && (
        <form className="post-create-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="board-select">게시판</label>
            <select id="board-select" value={boardType} disabled>
              {BOARD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="post-title">제목</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={24}
              placeholder="제목을 입력하세요 (최대 24자)"
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="post-content">본문</label>
            <textarea
              id="post-content"
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              placeholder="내용을 입력하세요 (최대 2,000자)"
            />
            <p className="form-hint">{contentHint}</p>
            {errors.content && <p className="form-error">{errors.content}</p>}
          </div>
          {boardType === 'FREE' && (
            <div className="form-group">
              <label htmlFor="image-upload">이미지 (최대 5장, 5MB 이하)</label>
              <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageChange} />
              {((detail.images?.filter((img) => img.key && imageKeys.includes(img.key))?.length ?? 0) > 0 ||
                newFilePreviews.length > 0) && (
                <div className="image-preview-grid">
                  {detail.images
                    ?.filter((img) => img.key && imageKeys.includes(img.key))
                    .map((img, index) => {
                      const keyIndex = imageKeys.indexOf(img.key!)
                      return (
                        <figure key={`existing-${img.imageId}`}>
                          <img
                            src={resolveImageUrl(img.url, DEFAULT_AVATAR_URL)}
                            alt={`기존 이미지 ${index + 1}`}
                          />
                          <button type="button" onClick={() => handleRemoveExistingImage(keyIndex)}>
                            삭제
                          </button>
                        </figure>
                      )
                    })}
                  {newFilePreviews.map((src, index) => (
                    <figure key={`new-${index}`}>
                      <img src={src} alt={`새 이미지 ${index + 1}`} />
                      <button type="button" onClick={() => handleRemoveNewImage(index)}>
                        삭제
                      </button>
                    </figure>
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
              {errors.schedule && <p className="form-error">{errors.schedule}</p>}
            </div>
          )}
          {boardType === 'PLACE_RECOMMEND' && (
            <div className="form-group">
              <label>위치 검색</label>
              <input
                type="text"
                value={selectedLocation?.name ?? ''}
                readOnly
                placeholder="위치를 검색하세요"
                onClick={() => setPlaceModalOpen(true)}
              />
              {selectedLocation && <p className="selected-location">선택 장소: {selectedLocation.name}</p>}
              {errors.location && <p className="form-error">{errors.location}</p>}
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
              {errors.rating && <p className="form-error">{errors.rating}</p>}
            </div>
          )}
        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate(`/posts/${detail.postId}`)}>
            취소
          </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={
                !isFormValid ||
                isSubmitting ||
                (boardType === 'PLAN_SHARE' && !selectedSchedule) ||
                (boardType === 'PLACE_RECOMMEND' && (!selectedLocation || !rating))
              }
            >
              {isSubmitting ? '수정 중...' : '수정하기'}
            </button>
         </div>
       </form>
     )}
      <PlaceSearchModal
        open={placeModalOpen}
        onClose={() => setPlaceModalOpen(false)}
        onSelect={(place) => {
          handleSelectPlace({
            name: place.name,
            city: place.addressText,
            googlePlaceId: place.googlePlaceId ?? place.placeId,
          })
          setPlaceModalOpen(false)
        }}
      />
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
      {toastInfo && <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />}
    </main>
  )
}
