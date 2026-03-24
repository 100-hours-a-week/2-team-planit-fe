import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createTrip,
  deleteTrip,
  fetchTripItineraryJob,
  fetchTripItineraries,
  updateTripDay,
} from '../api/trips'
import type { CreateTripPayload, TripData } from '../api/trips'
import { fetchTripGroup } from '../api/groups'
import {
  appendLimitedMessages,
  fetchTripChatMessages,
  fetchTripChatSummary,
  markTripChatRead,
  normalizeTripChatMessage,
} from '../api/chat'
import type { TripChatMessage } from '../api/chat'
import AppHeader from '../components/AppHeader'
import PlaceSearchPanel from '../components/PlaceSearchPanel'
import TripChatPanel from '../components/TripChatPanel'
import TripGoogleMap from '../components/TripGoogleMap'
import { authStore, useAuth } from '../store'
import type { PlaceSearchItem } from '../types/place'
import { connectStomp } from '../utils/stompLite'
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
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  const minutes = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minutes}`
})
const CREATE_ALLOWED_START_HOUR = 14
const CREATE_ALLOWED_END_HOUR = 2
const ITINERARY_JOB_POLL_INTERVAL_MS = 3000
const ITINERARY_JOB_TIMEOUT_MS = 300000
const CHAT_LIMIT = 50
const BYPASS_CREATE_TIME_LIMIT = (() => {
  const value = (import.meta.env.VITE_BYPASS_TRIP_CREATE_TIME_LIMIT as string | undefined)
    ?.trim()
    .toLowerCase()
  return value === 'true' || value === '1' || value === 'yes' || value === 'y'
})()

const WS_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim()
  if (configured) return configured
  const apiBaseUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'https://planit-ai.store/api'
  try {
    const url = new URL(apiBaseUrl)
    const contextPath = url.pathname.replace(/\/+$/, '')
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = `${contextPath}/ws/chat`.replace(/\/{2,}/g, '/')
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
})()

const DESTINATION_CODE_BY_LABEL: Record<string, string> = {
  '가오슝, 대만': 'KAOHSIUNG_TW',
  '괌, 미국': 'GUAM_US',
  '나고야, 일본': 'NAGOYA_JP',
  '나트랑, 베트남': 'NHA_TRANG_VN',
  '다낭, 베트남': 'DA_NANG_VN',
  '도쿄, 일본': 'TOKYO_JP',
  '런던, 영국': 'LONDON_GB',
  '로마, 이탈리아': 'ROME_IT',
  '마닐라, 필리핀': 'MANILA_PH',
  '마카오, 중국': 'MACAU_CN',
  '바르셀로나, 스페인': 'BARCELONA_ES',
  '방콕, 태국': 'BANGKOK_TH',
  '보라카이, 필리핀': 'BORACAY_PH',
  '보홀, 필리핀': 'BOHOL_PH',
  '사이판, 미국': 'SAIPAN_US',
  '삿포로, 일본': 'SAPPORO_JP',
  '상하이, 중국': 'SHANGHAI_CN',
  '세부, 필리핀': 'CEBU_PH',
  '싱가포르, 싱가포르': 'SINGAPORE_SG',
  '오사카, 일본': 'OSAKA_JP',
  '오키나와, 일본': 'OKINAWA_JP',
  '치앙마이, 태국': 'CHIANG_MAI_TH',
  '코타키나발루, 말레이시아': 'KOTA_KINABALU_MY',
  '쿠알라룸푸르, 말레이시아': 'KUALA_LUMPUR_MY',
  '타이베이, 대만': 'TAIPEI_TW',
  '파리, 프랑스': 'PARIS_FR',
  '푸꾸옥, 베트남': 'PHU_QUOC_VN',
  '하노이, 베트남': 'HANOI_VN',
  '홍콩, 중국': 'HONG_KONG_CN',
  '후쿠오카, 일본': 'FUKUOKA_JP',
}

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
type TravelMode = 'SOLO' | 'GROUP'
type StompConnection = ReturnType<typeof connectStomp>

type PlaceItem = {
  id: string
  name: string
  address: string
  googlePlaceId: string
  googleMapUrl: string
  marker: { lat: number; lng: number }
}

type ActivityDraft = {
  placeName?: string
  memo?: string
  cost?: string
  startTime?: string
}

type TripRouteState = {
  tripId?: number
  tripData?: TripData
  readonly?: boolean
}

const getApiErrorCode = (error: unknown) =>
  (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code

export default function TripCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ tripId?: string }>()
  const { accessToken, user } = useAuth()
  const [title, setTitle] = useState('')
  const [travelCity, setTravelCity] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [arrivalHour, setArrivalHour] = useState('')
  const [departureHour, setDepartureHour] = useState('')
  const [budget, setBudget] = useState('')
  const [headCount, setHeadCount] = useState('2')
  const [themes, setThemes] = useState<string[]>([])
  const [wantedPlaces, setWantedPlaces] = useState<PlaceItem[]>([])

  const [showTitleHelp, setShowTitleHelp] = useState(false)
  const [showBudgetHelp, setShowBudgetHelp] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
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
  const [activeTab, setActiveTab] = useState<'schedule' | 'chat'>('schedule')
  const [chatMessages, setChatMessages] = useState<TripChatMessage[]>([])
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatConnectionError, setChatConnectionError] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [editDrafts, setEditDrafts] = useState<Record<number, ActivityDraft>>({})
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const activeTabRef = useRef<'schedule' | 'chat'>('schedule')
  const stompRef = useRef<StompConnection | null>(null)
  const chatPayloadLogRef = useRef({ rest: false, realtime: false })

  const showWantedPlaceSection = true

  const routeTripId = Number(params.tripId)
  const locationState = (location.state as TripRouteState | null) ?? null
  const selectedTravelMode = (new URLSearchParams(location.search).get('travelMode') || 'SOLO')
    .trim()
    .toUpperCase() as TravelMode
  const isGroupMode = selectedTravelMode === 'GROUP'
  const stateTripId = Number(locationState?.tripId)
  const queryReadonly = new URLSearchParams(location.search).get('readonly') === 'true'
  const isReadonlyTripView = queryReadonly || Boolean(locationState?.readonly)
  const currentTripId = Number.isFinite(routeTripId) && routeTripId > 0
    ? routeTripId
    : Number.isFinite(stateTripId) && stateTripId > 0
      ? stateTripId
      : null
  const showStandaloneHeader = !currentTripId

  const handlePrimaryHeaderAction = () => {
    if (isReadonlyTripView) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  const applyFetchedTripData = (data: TripData) => {
    setTripData(data)
    const nextTripId =
      typeof data.tripId === 'number' ? data.tripId : Number(data.tripId)
    setTripId(Number.isFinite(nextTripId) ? nextTripId : null)
    setSelectedDay((prevDay) => {
      const hasPrevDay = Boolean(data.itineraries?.some((item) => item.day === prevDay))
      if (hasPrevDay) return prevDay
      return data.itineraries?.[0]?.day || 1
    })
    setPage('schedule')
  }

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
    Boolean(DESTINATION_CODE_BY_LABEL[travelCity]) &&
    arrivalDate &&
    departureDate &&
    arrivalHour !== '' &&
    departureHour !== '' &&
    isBudgetValid &&
    (!isGroupMode || (Number.isInteger(Number(headCount)) && Number(headCount) >= 2)) &&
    themes.length > 0

  const currentHour = currentTime.getHours()
  const isCreateWindowOpenByTime =
    currentHour >= CREATE_ALLOWED_START_HOUR || currentHour < CREATE_ALLOWED_END_HOUR
  const isCreateWindowOpen = BYPASS_CREATE_TIME_LIMIT || isCreateWindowOpenByTime

  const isDirty =
    title ||
    travelCity ||
    arrivalDate ||
    departureDate ||
    arrivalHour !== '' ||
    departureHour !== '' ||
    budget ||
    (isGroupMode && headCount !== '2') ||
    themes.length > 0 ||
    wantedPlaces.length > 0

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

  const loadChatSummary = useCallback(async () => {
    if (!currentTripId) return
    try {
      const unreadCount = await fetchTripChatSummary(currentTripId)
      setChatUnreadCount(unreadCount)
    } catch {
      setChatUnreadCount(0)
    }
  }, [currentTripId])

  const loadChatMessages = useCallback(async () => {
    if (!currentTripId) return
    setChatLoading(true)
    setChatError('')
    try {
      const messages = await fetchTripChatMessages(currentTripId, CHAT_LIMIT)
      setChatMessages(messages)
      if (import.meta.env.DEV && !chatPayloadLogRef.current.rest && messages.length > 0) {
        const first = messages[0]
        console.info('[chat] history payload fields', {
          senderNickname: first.senderNickname ?? null,
          senderProfileImageUrl: first.senderProfileImageUrl ?? null,
        })
        chatPayloadLogRef.current.rest = true
      }
    } catch {
      setChatError('메시지를 불러오지 못했습니다.')
    } finally {
      setChatLoading(false)
    }
  }, [currentTripId])

  const markChatRead = useCallback(async () => {
    if (!currentTripId) return
    try {
      await markTripChatRead(currentTripId)
      setChatUnreadCount(0)
    } catch {
      // noop
    }
  }, [currentTripId])

  const handleSubmitClick = () => {
    if (!isCreateWindowOpen) {
      showToast('일정생성 가능 시간이 아닙니다.')
      return
    }
    handleSubmit()
  }

  const toggleTheme = (theme: string) => {
    setThemes((prev) =>
      prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme],
    )
  }

  const handleRemovePlace = (id: string) => {
    setWantedPlaces((prev) => prev.filter((item) => item.id !== id))
  }

  const handlePlaceSelected = (place: PlaceSearchItem) => {
    setWantedPlaces((prev) => {
      if (prev.some((item) => item.googlePlaceId === place.googlePlaceId)) {
        return prev
      }
      return [
        ...prev,
        {
          id: place.googlePlaceId,
          name: place.name,
          address: place.address,
          googlePlaceId: place.googlePlaceId,
          googleMapUrl: place.googleMapUrl,
          marker: place.marker,
        },
      ]
    })
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
    const destinationCode = DESTINATION_CODE_BY_LABEL[travelCity]
    if (!destinationCode) {
      setSubmitState({ loading: false, error: '여행지 코드 매핑에 실패했습니다. 여행지를 다시 선택해주세요.' })
      return
    }

    const payload: CreateTripPayload = {
      title: title.trim(),
      arrivalDate,
      arrivalTime: String(arrivalHour).padStart(2, '0') + ':00',
      departureDate,
      departureTime: String(departureHour).padStart(2, '0') + ':00',
      travelCity,
      destinationCode,
      totalBudget: budgetValue,
      travelTheme: themes,
      wantedPlace: wantedPlaces.map((place) => place.googlePlaceId),
      travelMode: isGroupMode ? 'GROUP' : 'SOLO',
      headCount: isGroupMode ? Number(headCount) : undefined,
    }

    try {
      setSubmitState({ loading: true, error: '' })
      setPage('creating')
      const data = await createTrip(payload)
      const createdTripId = data.tripId
      const normalizedTripId =
        typeof createdTripId === 'number' ? createdTripId : Number(createdTripId) || null
      setTripId(normalizedTripId)

      if (isGroupMode) {
        if (!normalizedTripId) {
          setSubmitState({ loading: false, error: 'tripId가 없습니다.' })
          setPage('form')
          return
        }
        navigate(`/trips/${normalizedTripId}/waiting`, { replace: true })
        return
      }

      if (data?.itineraries?.length) {
        setTripData(data)
        setSelectedDay(data.itineraries[0]?.day || 1)
        setPage('schedule')
      } else if (!normalizedTripId) {
        setSubmitState({ loading: false, error: 'tripId가 없습니다.' })
        setPage('form')
      }
    } catch (error) {
      if (getApiErrorCode(error) === 'TRIP_007') {
        showToast('일정생성은 하루에 1회만 가능합니다')
        setSubmitState({ loading: false, error: '' })
      } else {
        setSubmitState({ loading: false, error: String(error) })
      }
      setPage('form')
    } finally {
      setSubmitState((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    if (page !== 'schedule' || !currentTripId) return
    void loadChatSummary()
  }, [currentTripId, loadChatSummary, page])

  useEffect(() => {
    if (page !== 'schedule') return
    if (!currentTripId || !accessToken) {
      setChatConnected(false)
      return
    }
    if (!WS_BASE_URL) {
      setChatConnected(false)
      setChatConnectionError('채팅 연결 실패')
      return
    }

    const token = authStore.accessToken
    if (!token) {
      setChatConnected(false)
      return
    }

    const connection = connectStomp({
      brokerURL: WS_BASE_URL,
      token,
      topic: `/topic/trips/${currentTripId}/chat`,
      onConnect: () => {
        setChatConnected(true)
        setChatConnectionError('')
      },
      onMessage: (body) => {
        try {
          const parsed = JSON.parse(body) as unknown
          const message = normalizeTripChatMessage(parsed)
          if (!message) return
          if (import.meta.env.DEV && !chatPayloadLogRef.current.realtime) {
            console.info('[chat] realtime payload fields', {
              senderNickname: message.senderNickname ?? null,
              senderProfileImageUrl: message.senderProfileImageUrl ?? null,
            })
            chatPayloadLogRef.current.realtime = true
          }
          setChatMessages((prev) => appendLimitedMessages([...prev, message], CHAT_LIMIT))
          if (activeTabRef.current !== 'chat') {
            setChatUnreadCount((prev) => prev + 1)
          }
        } catch {
          // noop
        }
      },
      onError: () => {
        setChatConnected(false)
        setChatConnectionError('채팅 연결 실패')
      },
    })

    stompRef.current = connection

    return () => {
      stompRef.current = null
      setChatConnected(false)
      connection.disconnect()
    }
  }, [accessToken, currentTripId, page])

  useEffect(() => {
    const stateTripData = locationState?.tripData
    if (stateTripData?.itineraries?.length) {
      applyFetchedTripData(stateTripData)
    }
  }, [locationState?.tripData])

  useEffect(() => {
    if (!currentTripId) return

    const moveToCreatingPage = () => {
      setTripId(currentTripId)
      setSubmitState({ loading: false, error: '' })
      setPage('creating')
    }

    const moveToGroupWaitingPageIfNeeded = async () => {
      try {
        const group = await fetchTripGroup(currentTripId)
        if (group.status === 'WAITING' || group.status === 'CANCELED') {
          navigate(`/trips/${currentTripId}/waiting`, { replace: true })
          return true
        }
      } catch {
        // Non-group trip or group API unavailable
      }
      return false
    }

    const fetchMine = async (silent = false) => {
      try {
        const data = await fetchTripItineraries(currentTripId)
        if (data?.itineraries?.length) {
          applyFetchedTripData(data)
        } else if (!silent) {
          const movedToWaiting = await moveToGroupWaitingPageIfNeeded()
          if (!movedToWaiting) {
            moveToCreatingPage()
          }
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (!silent && status === 404) {
          const movedToWaiting = await moveToGroupWaitingPageIfNeeded()
          if (!movedToWaiting) {
            moveToCreatingPage()
          }
          return
        }
        if (!silent) {
          console.error('fetchTripItineraries failed', error)
          showToast('일정 조회에 실패했습니다.')
          setPage('form')
        }
      }
    }

    fetchMine()
    const intervalId = window.setInterval(() => {
      if (!showEditMode) {
        fetchMine(true)
      }
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentTripId, navigate, showEditMode])

  useEffect(() => {
    if (page !== 'creating' || !tripId) return

    let isStopped = false
    let isPollingInFlight = false
    let intervalId: ReturnType<typeof window.setInterval> | null = null
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null

    const stopPolling = () => {
      isStopped = true
      if (intervalId) {
        window.clearInterval(intervalId)
        intervalId = null
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const showToastMessage = (message: string) => {
      setToast(message)
      window.setTimeout(() => setToast(''), 2500)
    }

    const recoverToForm = (toastMessage: string, submitError: string) => {
      if (isStopped) return
      stopPolling()
      showToastMessage(toastMessage)
      setSubmitState({ loading: false, error: submitError })
      setPage('form')
    }

    const handleSuccess = async () => {
      stopPolling()
      try {
        const data = await fetchTripItineraries(tripId)
        if (isStopped) return
        if (data?.itineraries?.length) {
          setTripData(data)
          setSelectedDay(data.itineraries[0]?.day || 1)
          setSubmitState({ loading: false, error: '' })
          setPage('schedule')
          return
        }
        recoverToForm(
          '생성된 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
          '생성된 일정을 불러오지 못했습니다.',
        )
      } catch {
        recoverToForm(
          '일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
          '일정을 불러오지 못했습니다.',
        )
      }
    }

    const pollItineraryJob = async () => {
      if (isStopped || isPollingInFlight) return
      isPollingInFlight = true
      try {
        const envelope = await fetchTripItineraryJob(tripId)
        if (isStopped) return
        const status = envelope.data?.status
        if (status === 'SUCCESS') {
          await handleSuccess()
          return
        }
        if (status === 'FAIL') {
          const errorMessage = envelope.data?.errorMessage?.trim() || '일정 생성에 실패했습니다. 다시 시도해주세요.'
          recoverToForm(errorMessage, errorMessage)
          return
        }
        if (status === 'PENDING' || status === 'PROCESSING') {
          return
        }
        recoverToForm('일정 생성 상태를 확인할 수 없습니다. 다시 시도해주세요.', '일정 생성 상태 확인에 실패했습니다.')
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          recoverToForm('로그인이 필요합니다. 다시 로그인해주세요.', '로그인이 필요합니다.')
          return
        }
        recoverToForm(
          '일정 생성 상태 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
          '일정 생성 상태 확인에 실패했습니다.',
        )
      } finally {
        isPollingInFlight = false
      }
    }

    void pollItineraryJob()
    intervalId = window.setInterval(() => {
      void pollItineraryJob()
    }, ITINERARY_JOB_POLL_INTERVAL_MS)
    timeoutId = window.setTimeout(() => {
      recoverToForm(
        '일정 생성이 지연되고 있어요. 잠시 후 다시 확인해주세요.',
        '일정 생성이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      )
    }, ITINERARY_JOB_TIMEOUT_MS)

    return () => {
      stopPolling()
    }
  }, [page, tripId])

  const safeTitle = title.length > 15 ? `${title.slice(0, 15)}...` : title
  const periodLabel = arrivalDate && departureDate ? `${arrivalDate} ~ ${departureDate}` : ''
  const scheduleTitle = tripData?.title?.trim() || safeTitle || '여행 일정'
  const schedulePeriod =
    tripData?.startDate && tripData?.endDate
      ? `${tripData.startDate} - ${tripData.endDate}`
      : periodLabel

  const dayTabs = tripData?.itineraries ?? []
  const selectedItinerary = dayTabs.find((item) => item.day === selectedDay)
  const sortedActivities = [...(selectedItinerary?.activities ?? [])].sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0
    return a.startTime.localeCompare(b.startTime)
  })
  const selectedDayPlaceIds = Array.from(
    new Set(
      sortedActivities
        .map((activity) => activity.googlePlaceId?.trim() || '')
        .filter(Boolean),
    ),
  )

  const openScheduleTab = () => {
    setActiveTab('schedule')
  }

  const openChatTab = async () => {
    if (!accessToken || !authStore.accessToken) {
      showToast('로그인이 필요합니다')
      return
    }
    setActiveTab('chat')
    await loadChatMessages()
    await markChatRead()
  }

  const sendChatMessage = (content: string) => {
    if (!currentTripId) return
    const connection = stompRef.current
    if (!connection || !connection.isConnected()) {
      setChatConnectionError('채팅 연결 실패')
      return
    }
    try {
      connection.publish(`/app/trips/${currentTripId}/chat.send`, JSON.stringify({ content }))
    } catch {
      setChatConnectionError('채팅 연결 실패')
    }
  }

  if (page === 'creating') {
    return (
      <main className="home-shell">
        {showStandaloneHeader && <AppHeader />}
        <div className="planit-trip">
          <div className="page creating">
            <header className="topbar">
              <div className="title-block">
                <h1>{safeTitle || '일정 생성중'}</h1>
                {periodLabel && <p>{periodLabel}</p>}
              </div>
              <button className="pill-button" onClick={handlePrimaryHeaderAction}>
                {isReadonlyTripView ? '뒤로가기' : '홈으로'}
              </button>
            </header>
            <div className="creating-body">
              <div className="creating-visual" aria-hidden="true">
                <div className="creating-orb">
                  <span className="creating-bot">🤖</span>
                </div>
              </div>
              <div className="creating-copy">
                <p className="creating-title">AI가 최적의 경로를 생성 중입니다.</p>
                <p className="creating-description">
                  여행 기간과 테마, 예산, 가고 싶은 장소를 함께 고려해 동선을 정리하고 있어요.
                </p>
              </div>
              <div className="dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (page === 'schedule') {
    const rawDayId =
      selectedItinerary?.dayId ??
      selectedItinerary?.itineraryDayId ??
      null
    const dayId = typeof rawDayId === 'number' ? rawDayId : Number(rawDayId)

    return (
      <main className="home-shell">
        {showStandaloneHeader && <AppHeader />}
        <div className="planit-trip">
          <div className="page schedule">
          <header className="schedule-header">
            <div className="title-block">
              <h1>{scheduleTitle}</h1>
              {schedulePeriod && <p>{schedulePeriod}</p>}
            </div>
            <div className="day-actions">
              {!isReadonlyTripView && (
                <>
                  <button
                    className="pill-button"
                    disabled={!currentTripId || (!isReadonlyTripView && tripData?.isOwner === false)}
                    onClick={async () => {
                      if (!currentTripId) return
                      try {
                        await deleteTrip(currentTripId)
                        showToast('일정이 삭제되었습니다.')
                        navigate('/')
                      } catch (error) {
                        console.error('deleteTrip failed', error)
                        showToast('일정 삭제에 실패했습니다.')
                      }
                    }}
                  >
                    일정 삭제
                  </button>
                  {!isGroupMode && (
                    <button
                      className="pill-button"
                      disabled={!isReadonlyTripView && tripData?.isOwner === false}
                      onClick={async () => {
                      if (!showEditMode) {
                        const drafts: Record<number, ActivityDraft> = {}
                        sortedActivities.forEach((activity) => {
                          if (!activity.activityId) return
                          drafts[activity.activityId] = {
                            placeName: activity.placeName ?? '',
                            memo: activity.memo ?? '',
                            cost: activity.cost != null ? String(activity.cost) : '',
                            startTime: activity.startTime ?? '',
                          }
                        })
                        setEditDrafts(drafts)
                        setShowEditMode(true)
                        return
                      }

                      if (!Number.isFinite(dayId) || dayId <= 0) {
                        showToast('일정 정보가 없어 수정할 수 없습니다.')
                        return
                      }
                      if (!currentTripId) {
                        showToast('여행 정보가 없어 수정할 수 없습니다.')
                        return
                      }

                      const updates = sortedActivities.reduce(
                        (acc, activity) => {
                          if (!activity.activityId) return acc
                          const draft = editDrafts[activity.activityId]
                          if (!draft) return acc

                          const trimmedPlace = draft.placeName?.trim()
                          const trimmedMemo = draft.memo?.trim()
                          const nextCost =
                            draft.cost && draft.cost.trim() !== ''
                              ? Number.parseInt(draft.cost, 10)
                              : undefined

                          const changes: {
                            activityId: number
                            placeName?: string
                            memo?: string
                            cost?: number
                            startTime?: string
                          } = { activityId: activity.activityId }

                          if (trimmedPlace && trimmedPlace !== (activity.placeName ?? '')) {
                            changes.placeName = trimmedPlace
                          }
                          if (trimmedMemo && trimmedMemo !== (activity.memo ?? '')) {
                            changes.memo = trimmedMemo
                          }
                          if (
                            typeof nextCost === 'number' &&
                            Number.isFinite(nextCost) &&
                            nextCost !== activity.cost
                          ) {
                            changes.cost = nextCost
                          }
                          if (draft.startTime && draft.startTime !== (activity.startTime ?? '')) {
                            changes.startTime = draft.startTime
                          }

                          const keys = Object.keys(changes)
                          if (keys.length > 1) {
                            acc.push(changes)
                          }
                          return acc
                        },
                        [] as {
                          activityId: number
                          placeName?: string
                          memo?: string
                          cost?: number
                          startTime?: string
                        }[],
                      )

                      if (updates.length === 0) {
                        showToast('변경된 내용이 없습니다.')
                        setShowEditMode(false)
                        setEditDrafts({})
                        return
                      }

                      try {
                        await updateTripDay(currentTripId, dayId, updates)
                        showToast('일정이 수정되었습니다.')
                        setShowEditMode(false)
                        setEditDrafts({})
                        const latestData = await fetchTripItineraries(currentTripId)
                        if (latestData?.itineraries?.length) {
                          applyFetchedTripData(latestData)
                        }
                      } catch (error) {
                        console.error('final updateTripDay catch', error)
                        showToast('일정 수정에 실패했습니다.')
                      }
                      }}
                    >
                      {showEditMode ? '수정 완료' : '일정 수정'}
                    </button>
                  )}
                </>
              )}
              <button className="pill-button" onClick={handlePrimaryHeaderAction}>
                {isReadonlyTripView ? '뒤로가기' : '홈으로'}
              </button>
            </div>
          </header>
          {toast && <div className="toast">{toast}</div>}

          <div className="tab-row">
            <button
              className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
              type="button"
              onClick={openScheduleTab}
            >
              <span className="tab-icon" aria-hidden="true">🗺</span>
              일정
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => {
                void openChatTab()
              }}
            >
              <span className="tab-icon" aria-hidden="true">💬</span>
              채팅
              {chatUnreadCount > 0 && activeTab !== 'chat' && <span className="badge" />}
            </button>
          </div>

          {activeTab === 'chat' ? (
            <TripChatPanel
              messages={chatMessages}
              currentUserId={user?.id}
              loading={chatLoading}
              errorMessage={chatError}
              connectionErrorMessage={chatConnectionError}
              isConnected={chatConnected}
              onSend={sendChatMessage}
            />
          ) : (
            <>
              <div className="map-box" onClick={() => setShowMap(true)}>
                <TripGoogleMap placeIds={selectedDayPlaceIds} />
                <div className="map-preview-badge">
                  <strong>지도 보기</strong>
                  <span>클릭하여 확대</span>
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
                  <button
                    type="button"
                    className={`pill-button${isReadonlyTripView ? ' disabled' : ''}`}
                    disabled={isReadonlyTripView}
                    onClick={() => {
                      if (isReadonlyTripView) {
                        return
                      }
                      showToast('미지원 기능입니다.')
                    }}
                  >
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
                  const memoText = activity.memo?.trim() || ''
                  const draft = activity.activityId ? editDrafts[activity.activityId] : undefined

                  return (
                    <div
                      key={activity.activityId || `${activity.startTime}-${index}`}
                      className={`activity-card ${activity.type?.toLowerCase?.() || ''}`}
                    >
                      <div className="order">{index + 1}</div>
                      <div className="activity-body">
                        {showEditMode && activity.activityId ? (
                          <>
                            <div className="activity-edit-row">
                              <select
                                value={draft?.startTime ?? activity.startTime ?? ''}
                                onChange={(event) =>
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [activity.activityId as number]: {
                                      ...(prev[activity.activityId as number] ?? {}),
                                      startTime: event.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="">시간 선택</option>
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="activity-edit-row">
                              <input
                                type="text"
                                placeholder="장소"
                                value={draft?.placeName ?? activity.placeName ?? ''}
                                onChange={(event) =>
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [activity.activityId as number]: {
                                      ...(prev[activity.activityId as number] ?? {}),
                                      placeName: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="activity-edit-row">
                              <input
                                type="text"
                                placeholder="메모"
                                value={draft?.memo ?? activity.memo ?? ''}
                                onChange={(event) =>
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [activity.activityId as number]: {
                                      ...(prev[activity.activityId as number] ?? {}),
                                      memo: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="activity-edit-row">
                              <input
                                type="number"
                                placeholder="비용"
                                value={draft?.cost ?? (activity.cost != null ? String(activity.cost) : '')}
                                onChange={(event) =>
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [activity.activityId as number]: {
                                      ...(prev[activity.activityId as number] ?? {}),
                                      cost: event.target.value.replace(/\D/g, ''),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <button
                            className="activity-readonly"
                            onClick={() => {
                              if (activity.googleMapUrl) {
                                window.open(activity.googleMapUrl, '_blank')
                              }
                            }}
                          >
                            <div className="time">{activity.startTime}</div>
                            <div className="name">{name}</div>
                            {memoText && <div className="memo">{memoText}</div>}
                            <div className="meta">
                              <span />
                              <span>{costLabel}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {showMap && (
            <div className="modal-backdrop" onClick={() => setShowMap(false)}>
              <div className="modal map-modal" onClick={(event) => event.stopPropagation()}>
                <header>
                  <h3>지도 확대</h3>
                  <button className="icon-button" onClick={() => setShowMap(false)}>
                    ✕
                  </button>
                </header>
                <TripGoogleMap placeIds={selectedDayPlaceIds} expanded />
              </div>
            </div>
          )}

          {showRegenModal && (
            <div className="modal-backdrop" onClick={() => setShowRegenModal(false)}>
              <div className="modal" onClick={(event) => event.stopPropagation()}>
                <header>
                  <h3>미지원 기능입니다.</h3>
                  <button className="icon-button" onClick={() => setShowRegenModal(false)}>
                    ✕
                  </button>
                </header>
              </div>
            </div>
          )}

          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="home-shell">
      {showStandaloneHeader && <AppHeader />}
      <div className="planit-trip">
        <div className="page">
          <header className="topbar">
            <button className="icon-button" onClick={handleBack}>
              ←
            </button>
            <div className="title-block title-block-centered">
              <h1>여행 정보 입력</h1>
              <p>AI 플래너가 일정 컨셉에 맞춰 동선을 설계합니다.</p>
            </div>
            <div />
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
              {isGroupMode ? (
                <input
                  type="number"
                  min={2}
                  value={headCount}
                  onChange={(event) => setHeadCount(event.target.value.replace(/\D/g, ''))}
                />
              ) : (
                <input type="text" value="1" disabled />
              )}
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

        {showWantedPlaceSection && (
          <section className="section">
            <label>꼭 가보고 싶은 곳이 있나요?</label>
            <PlaceSearchPanel
              key={travelCity}
              initialDestinationCode={DESTINATION_CODE_BY_LABEL[travelCity] ?? ''}
              onPlaceSelected={handlePlaceSelected}
            />
            {wantedPlaces.length > 0 && (
              <div className="place-list">
                {wantedPlaces.map((place) => (
                  <div key={place.id} className="place-item">
                    <div>
                      <strong>{place.name}</strong>
                      <p className="helper-text">{place.address}</p>
                    </div>
                    <button className="remove" onClick={() => handleRemovePlace(place.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="section">
          <button
            className={`submit ${!isCreateWindowOpen ? 'time-locked' : ''}`}
            onClick={handleSubmitClick}
            disabled={!requiredReady || submitState.loading}
            aria-disabled={!requiredReady || submitState.loading || !isCreateWindowOpen}
          >
            {isGroupMode ? '입력 완료 & 대기방 입장 →' : '입력 완료 & 일정 생성 →'}
          </button>
          {!isCreateWindowOpenByTime && !BYPASS_CREATE_TIME_LIMIT && (
            <div className="helper warning">※ 일정 생성은 14:00~02:00에만 가능합니다.</div>
          )}
          {travelCity && !DESTINATION_CODE_BY_LABEL[travelCity] && (
            <div className="helper warning">※ 선택한 여행지의 destinationCode 매핑이 없습니다.</div>
          )}
          {!requiredReady && <div className="helper warning">※ 필수 입력 항목(*)을 모두 입력해주세요.</div>}
          {isGroupMode && Number(headCount) < 2 && (
            <div className="helper warning">※ 인원수는 팀장 포함 2명 이상이어야 합니다.</div>
          )}
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
    </main>
  )
}
