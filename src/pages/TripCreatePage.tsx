import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTrip, fetchTripItineraries } from '../api/trips'
import type { TripData } from '../api/trips'
import './TripCreatePage.css'

const CITY_OPTIONS = [
  '가오슝, 대만',
  '괌, 미국',
  '나고야, 일본',
  '나트랑, 베트남',
  '다낭, 베트남',
  '도쿄, 일본',
  '런던, 영국',
  '로마, 이탈리아',
  '마닐라, 필리핀',
  '마카오, 중국',
  '바르셀로나, 스페인',
  '방콕, 태국',
  '보라카이, 필리핀',
  '보홀, 필리핀',
  '사이판, 미국',
  '삿포로, 일본',
  '상하이, 중국',
  '세부, 필리핀',
  '싱가포르, 싱가포르',
  '오사카, 일본',
  '오키나와, 일본',
  '치앙마이, 태국',
  '코타키나발루, 말레이시아',
  '쿠알라룸푸르, 말레이시아',
  '타이베이, 대만',
  '파리, 프랑스',
  '푸꾸옥, 베트남',
  '하노이, 베트남',
  '홍콩, 중국',
  '후쿠오카, 일본',
]

const THEMES = [
  '힐링/휴식',
  '맛집탐방',
  '액티비티',
  '사진명소',
  '문화/예술',
  '관광지',
  '쇼핑',
  '자연',
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

const toDate = (dateStr: string) => (dateStr ? new Date(`${dateStr}T00:00:00`) : null)

const addDays = (dateStr: string, days: number) => {
  const base = toDate(dateStr)
  if (!base) return ''
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const calcDays = (start: string, end: string) => {
  if (!start || !end) return null
  const s = toDate(start)
  const e = toDate(end)
  if (!s || !e) return null
  const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  if (Number.isNaN(diff) || diff < 0) return null
  return diff + 1
}

type SubmitState = { loading: boolean; error: string }

type PlaceItem = {
  id: number
  name: string
}

export default function TripCreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [travelCity, setTravelCity] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [arrivalHour, setArrivalHour] = useState('')
  const [departureHour, setDepartureHour] = useState('')
  const [budget, setBudget] = useState('')
  const [themes, setThemes] = useState<string[]>([])
  const [wantedPlaces, setWantedPlaces] = useState<PlaceItem[]>([])

  const [showTitleHelp, setShowTitleHelp] = useState(false)
  const [showBudgetHelp, setShowBudgetHelp] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [dateError, setDateError] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>({ loading: false, error: '' })
  const [page, setPage] = useState<'form' | 'creating' | 'schedule'>('form')
  const [tripId, setTripId] = useState<number | null>(null)
  const [tripData, setTripData] = useState<TripData | null>(null)
  const [selectedDay, setSelectedDay] = useState(1)
  const [showMap, setShowMap] = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showEditMode, setShowEditMode] = useState(false)
  const [hasNewChat] = useState(false)

  const [placeDraft, setPlaceDraft] = useState('')

  const tripDays = useMemo(() => calcDays(arrivalDate, departureDate), [arrivalDate, departureDate])
  const minBudget = tripDays ? tripDays * 5 : 5
  const budgetValue = Number.parseInt(budget, 10)
  const isBudgetValid =
    Number.isFinite(budgetValue) &&
    budgetValue >= minBudget &&
    budgetValue <= 999_999_999

  const requiredReady =
    title.trim().length > 0 &&
    travelCity &&
    arrivalDate &&
    departureDate &&
    arrivalHour !== '' &&
    departureHour !== '' &&
    isBudgetValid &&
    themes.length > 0

  const isDirty =
    title ||
    travelCity ||
    arrivalDate ||
    departureDate ||
    arrivalHour !== '' ||
    departureHour !== '' ||
    budget ||
    themes.length > 0 ||
    wantedPlaces.length > 0

  const hasOutOfCityPlace = useMemo(() => {
    if (!travelCity || wantedPlaces.length === 0) return false
    const cityKey = travelCity.split(',')[0]?.trim()
    if (!cityKey) return false
    return wantedPlaces.some((place) => !place.name.includes(cityKey))
  }, [travelCity, wantedPlaces])

  const dateDisplay =
    arrivalDate && departureDate
      ? `${formatDisplayDate(arrivalDate)} - ${formatDisplayDate(departureDate)}`
      : ''

  const arrivalMax = departureDate ? addDays(departureDate, -6) : ''
  const departureMin = arrivalDate ? arrivalDate : ''
  const departureMax = arrivalDate ? addDays(arrivalDate, 6) : ''

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const toggleTheme = (theme: string) => {
    setThemes((prev) =>
      prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme],
    )
  }

  const handleAddPlace = () => {
    const trimmed = placeDraft.trim()
    if (!trimmed) return
    const next = { id: Date.now(), name: trimmed }
    setWantedPlaces((prev) => [...prev, next])
    setPlaceDraft('')

    if (travelCity) {
      const cityKey = travelCity.split(',')[0]?.trim()
      if (cityKey && !trimmed.includes(cityKey)) {
        showToast('여행지에서 벗어나는 장소입니다.')
      }
    }
  }

  const handleRemovePlace = (id: number) => {
    setWantedPlaces((prev) => prev.filter((item) => item.id !== id))
  }

  const handleBack = () => {
    if (isDirty) {
      setShowBackConfirm(true)
      return
    }
    navigate('/')
  }

  const handleSubmit = async () => {
    setSubmitState({ loading: false, error: '' })

    if (!requiredReady) return

    if (hasOutOfCityPlace) {
      showToast('장소 선택에서 여행지에 벗어나는 장소가 포함되어 있습니다.')
      return
    }

    const payload = {
      title: title.trim(),
      arrivalDate,
      arrivalTime: String(arrivalHour).padStart(2, '0') + ':00',
      departureDate,
      departureTime: String(departureHour).padStart(2, '0') + ':00',
      travelCity,
      totalBudget: budgetValue,
      travelTheme: themes,
      wantedPlace: wantedPlaces.map((place) => place.name),
    }

    try {
      setSubmitState({ loading: true, error: '' })
      setPage('creating')
      const data = await createTrip(payload)
      const createdTripId = data.tripId
      const normalizedTripId =
        typeof createdTripId === 'number' ? createdTripId : Number(createdTripId) || null
      setTripId(normalizedTripId)

      if (data?.itineraries?.length) {
        setTripData(data)
        setSelectedDay(data.itineraries[0]?.day || 1)
        setPage('schedule')
      } else if (!normalizedTripId) {
        setSubmitState({ loading: false, error: 'tripId가 없습니다.' })
        setPage('form')
      }
    } catch (error) {
      setSubmitState({ loading: false, error: String(error) })
      setPage('form')
    } finally {
      setSubmitState((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof window.setInterval> | null = null

    const fetchTrip = async () => {
      if (!tripId) return
      try {
        const data = await fetchTripItineraries(tripId)
        if (data?.itineraries?.length) {
          setTripData(data)
          setSelectedDay(data.itineraries[0]?.day || 1)
          setPage('schedule')
        }
      } catch (error) {
        setSubmitState((prev) => ({ ...prev, error: String(error) }))
      }
    }

    if (page === 'creating' && tripId) {
      fetchTrip()
      intervalId = window.setInterval(fetchTrip, 300000)
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [page, tripId])

  const safeTitle = title.length > 15 ? `${title.slice(0, 15)}...` : title
  const periodLabel = arrivalDate && departureDate ? `${arrivalDate} ~ ${departureDate}` : ''

  const dayTabs = tripData?.itineraries ?? []
  const selectedItinerary = dayTabs.find((item) => item.day === selectedDay)
  const sortedActivities = [...(selectedItinerary?.activities ?? [])].sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0
    return a.startTime.localeCompare(b.startTime)
  })
  const typeLabels: Record<string, string> = {
    Restaurant: '식당',
    Attraction: '관광지',
    Route: '이동',
  }

  if (page === 'creating') {
    return (
      <div className="planit-trip">
        <div className="page creating">
          <header className="topbar">
            <div className="title-block">
              <h1>{safeTitle || '일정 생성중'}</h1>
              {periodLabel && <p>{periodLabel}</p>}
            </div>
            <button className="pill-button" onClick={() => setPage('form')}>
              홈으로
            </button>
          </header>
          <div className="creating-body">
            <p>여행 일정을 생성 중 입니다.</p>
            <p>잠시만 기다려 주세요.</p>
            <div className="dots">••••</div>
          </div>
        </div>
      </div>
    )
  }

  if (page === 'schedule') {
    return (
      <div className="planit-trip">
        <div className="page schedule">
          <header className="schedule-header">
            <div className="title-block">
              <h1>{safeTitle || '여행 일정'}</h1>
              <p>{periodLabel}</p>
            </div>
            <button className="pill-button" onClick={() => setPage('form')}>
              홈으로
            </button>
          </header>

          <div className="tab-row">
            <button className="tab active">일정</button>
            <button className="tab">
              채팅
              {hasNewChat && <span className="badge" />}
            </button>
          </div>

          <div className="map-box" onClick={() => setShowMap(true)}>
            <div className="map-placeholder">
              <span>지도 보기 (클릭하여 확대)</span>
            </div>
          </div>

          <div className="day-tabs">
            {dayTabs.map((item) => (
              <button
                key={item.day}
                className={`day-tab ${item.day === selectedDay ? 'active' : ''}`}
                onClick={() => setSelectedDay(item.day)}
              >
                Day {item.day}
              </button>
            ))}
          </div>

          <div className="day-header">
            <div className="day-label">Day {selectedDay}</div>
            <div className="day-actions">
              <button className="pill-button" onClick={() => setShowEditMode(!showEditMode)}>
                일정 수정
              </button>
              <button className="pill-button" onClick={() => setShowRegenModal(true)}>
                일정 재생성
              </button>
            </div>
          </div>
          <div className="day-subtitle">선택된 일자: Day {selectedDay}</div>

          <div className="timeline">
            {sortedActivities.map((activity, index) => {
              const costLabel =
                activity.cost === 0
                  ? '무료'
                  : activity.cost
                    ? `${activity.cost.toLocaleString()}원`
                    : '-'
              const name = activity.placeName || activity.transport || '이동'

              return (
                <button
                  key={activity.activityId || `${activity.startTime}-${index}`}
                  className={`activity-card ${activity.type?.toLowerCase?.() || ''}`}
                  onClick={() => {
                    if (activity.googleMapUrl) {
                      window.open(activity.googleMapUrl, '_blank')
                    }
                  }}
                >
                  <div className="order">{index + 1}</div>
                  <div className="activity-body">
                    <div className="time">{activity.startTime}</div>
                    <div className="name">{name}</div>
                    <div className="meta">
                      <span>{typeLabels[activity.type || ''] || activity.type}</span>
                      <span>{costLabel}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {showMap && (
            <div className="modal-backdrop" onClick={() => setShowMap(false)}>
              <div className="modal map-modal" onClick={(event) => event.stopPropagation()}>
                <header>
                  <h3>지도 확대</h3>
                  <button className="icon-button" onClick={() => setShowMap(false)}>
                    ✕
                  </button>
                </header>
                <div className="map-placeholder large">
                  <span>지도 영역</span>
                </div>
              </div>
            </div>
          )}

          {showRegenModal && (
            <div className="modal-backdrop" onClick={() => setShowRegenModal(false)}>
              <div className="modal" onClick={(event) => event.stopPropagation()}>
                <header>
                  <h3>일정 재생성 테마 선택</h3>
                  <button className="icon-button" onClick={() => setShowRegenModal(false)}>
                    ✕
                  </button>
                </header>
                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button key={theme} type="button" className="theme-chip">
                      {theme}
                    </button>
                  ))}
                </div>
                <footer>
                  <button className="pill-button">일정 재생성</button>
                </footer>
              </div>
            </div>
          )}

          {showEditMode && (
            <div className="modal-backdrop" onClick={() => setShowEditMode(false)}>
              <div className="modal" onClick={(event) => event.stopPropagation()}>
                <header>
                  <h3>일정 수정 (준비중)</h3>
                  <button className="icon-button" onClick={() => setShowEditMode(false)}>
                    ✕
                  </button>
                </header>
                <div className="modal-body">
                  <p>시간/장소/메모/금액 수정 컴포넌트 영역</p>
                </div>
                <footer>
                  <button className="pill-button">수정 완료</button>
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="planit-trip">
      <div className="page">
        <header className="topbar">
          <button className="icon-button" onClick={handleBack}>
            ←
          </button>
          <h1>여행 정보 입력</h1>
          <div className="topbar-actions">
            <button className="pill-button">알림</button>
            <div className="avatar">U</div>
          </div>
        </header>

        {toast && <div className="toast">{toast}</div>}

        <section className="section">
          <h2>여행 기본 정보</h2>
          <div className="field">
            <label>
              여행 제목<span className="required">*</span>
              {showTitleHelp && <span className="helper">※제목은 15글자를 초과할 수 없습니다.</span>}
            </label>
            <input
              type="text"
              value={title}
              maxLength={15}
              placeholder="여행 제목을 입력하세요"
              onFocus={() => setShowTitleHelp(true)}
              onBlur={() => setShowTitleHelp(false)}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                여행지<span className="required">*</span>
              </label>
              <select value={travelCity} onChange={(event) => setTravelCity(event.target.value)}>
                <option value="">선택해주세요</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>
                인원수<span className="required">*</span>
              </label>
              <input type="text" value="1" disabled />
            </div>
          </div>

          <div className="field">
            <label>
              항공편 정보<span className="required">*</span>
            </label>
            <button className="input-button" onClick={() => setShowDateModal(true)}>
              {dateDisplay || '날짜를 선택하세요'}
              <span className="icon">📅</span>
            </button>
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                가는 편 (도착 시각)<span className="required">*</span>
              </label>
              <select value={arrivalHour} onChange={(event) => setArrivalHour(event.target.value)}>
                <option value="">선택</option>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}시
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>
                돌아오는 편 (출발 시각)<span className="required">*</span>
              </label>
              <select value={departureHour} onChange={(event) => setDepartureHour(event.target.value)}>
                <option value="">선택</option>
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}시
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              인당 희망 예산<span className="required">*</span>
              {showBudgetHelp && <span className="helper">항공 예산을 제외한 금액을 입력해 주세요.</span>}
            </label>
            <div className="budget-row">
              <input
                type="number"
                value={budget}
                min={minBudget}
                max={999999999}
                placeholder="예산 입력"
                onFocus={() => setShowBudgetHelp(true)}
                onBlur={() => setShowBudgetHelp(false)}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, '')
                  setBudget(nextValue)
                }}
              />
              <span className="unit">만원</span>
            </div>
            {budget && Number(budget) < minBudget && (
              <div className="helper warning">예산이 {minBudget}만원보다 많아야 합니다.</div>
            )}
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            선호 테마 (복수 선택 가능)<span className="required">*</span>
          </div>
          <div className="theme-grid">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                className={`theme-chip ${themes.includes(theme) ? 'active' : ''}`}
                onClick={() => toggleTheme(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <label>꼭 가보고 싶은 곳이 있나요?</label>
          <button className="input-button" onClick={() => setShowPlaceModal(true)}>
            <span className="placeholder">예: 해운대, 성심당, 디즈니랜드...</span>
          </button>
          {wantedPlaces.length > 0 && (
            <div className="place-list">
              {wantedPlaces.map((place) => (
                <div key={place.id} className="place-item">
                  <span>{place.name}</span>
                  <button className="remove" onClick={() => handleRemovePlace(place.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <button
            className="submit"
            onClick={handleSubmit}
            disabled={!requiredReady || submitState.loading}
          >
            입력 완료 &amp; 대기방 입장 →
          </button>
          {!requiredReady && <div className="helper warning">※ 필수 입력 항목(*)을 모두 입력해주세요.</div>}
          {submitState.error && <div className="helper warning">{submitState.error}</div>}
        </section>

        {showDateModal && (
          <div className="modal-backdrop" onClick={() => setShowDateModal(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <header>
                <h3>항공편 정보 - 날짜</h3>
                <button className="icon-button" onClick={() => setShowDateModal(false)}>
                  ✕
                </button>
              </header>
              <div className="modal-body">
                <div className="field-row">
                  <div className="field">
                    <label>가는 날</label>
                    <input
                      type="date"
                      value={arrivalDate}
                      max={arrivalMax || undefined}
                      onChange={(event) => {
                        setDateError('')
                        setArrivalDate(event.target.value)
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>오는 날</label>
                    <input
                      type="date"
                      value={departureDate}
                      min={departureMin || undefined}
                      max={departureMax || undefined}
                      onChange={(event) => {
                        setDateError('')
                        setDepartureDate(event.target.value)
                      }}
                    />
                  </div>
                </div>
                <div className="helper">여행 일정은 최대 7일입니다.</div>
                {dateError && <div className="helper warning">{dateError}</div>}
              </div>
              <footer>
                <button
                  className="pill-button"
                  onClick={() => {
                    const days = calcDays(arrivalDate, departureDate)
                    if (!days || days > 7) {
                      setDateError('여행 일정은 최대 7일까지만 가능합니다.')
                      return
                    }
                    setShowDateModal(false)
                  }}
                >
                  적용
                </button>
              </footer>
            </div>
          </div>
        )}

        {showPlaceModal && (
          <div className="modal-backdrop" onClick={() => setShowPlaceModal(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <header>
                <h3>장소 선택</h3>
                <button className="icon-button" onClick={() => setShowPlaceModal(false)}>
                  ✕
                </button>
              </header>
              <div className="modal-body">
                <div className="field">
                  <label>장소를 입력하세요</label>
                  <div className="place-input-row">
                    <input
                      type="text"
                      placeholder="예: 성심당"
                      value={placeDraft}
                      onChange={(event) => setPlaceDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddPlace()
                        }
                      }}
                    />
                    <button className="pill-button" onClick={handleAddPlace}>
                      추가
                    </button>
                  </div>
                </div>
                {wantedPlaces.length > 0 && (
                  <div className="place-list">
                    {wantedPlaces.map((place) => (
                      <div key={place.id} className="place-item">
                        <span>{place.name}</span>
                        <button className="remove" onClick={() => handleRemovePlace(place.id)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showBackConfirm && (
          <div className="modal-backdrop" onClick={() => setShowBackConfirm(false)}>
            <div className="modal small" onClick={(event) => event.stopPropagation()}>
              <header>
                <h3>작성중인 내용이 저장되지 않습니다. 작성을 취소하시겠습니까?</h3>
              </header>
              <footer className="confirm">
                <button className="pill-button" onClick={() => navigate('/')}>
                  예
                </button>
                <button className="pill-button ghost" onClick={() => setShowBackConfirm(false)}>
                  아니오
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
