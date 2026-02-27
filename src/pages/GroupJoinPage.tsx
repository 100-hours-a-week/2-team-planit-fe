import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchTripGroup,
  fetchGroupJoin,
  submitGroupJoin,
  type GroupJoinDetailResponse,
} from '../api/groups'
import PlaceSearchPanel from '../components/PlaceSearchPanel'
import type { PlaceSearchItem } from '../types/place'
import './GroupFlowPage.css'

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

const JOIN_POLL_INTERVAL_MS = 3000
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

type PlaceItem = {
  id: string
  name: string
  address: string
  googlePlaceId: string
}

const getErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message

export default function GroupJoinPage() {
  const { inviteCode = '' } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<GroupJoinDetailResponse | null>(null)
  const [themes, setThemes] = useState<string[]>([])
  const [wantedPlaces, setWantedPlaces] = useState<PlaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const loadJoinDetail = useCallback(async (silent = false) => {
    if (!inviteCode) {
      setError('잘못된 초대 코드입니다.')
      setLoading(false)
      return
    }
    try {
      const data = await fetchGroupJoin(inviteCode)
      setDetail(data)
      if (!silent) {
        setError('')
      }
    } catch (loadError) {
      if (!silent) {
        setError(getErrorMessage(loadError) || '초대 정보를 불러오지 못했습니다.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [inviteCode])

  useEffect(() => {
    void loadJoinDetail()
  }, [loadJoinDetail])

  const isExpiredByDate = Boolean(detail?.expiresAt && new Date(detail.expiresAt).getTime() <= Date.now())
  const isExpired = detail?.status === 'EXPIRED' || isExpiredByDate

  useEffect(() => {
    const pollingTripId = detail?.tripId
    if (!submitted || !pollingTripId || isExpired) return
    const intervalId = window.setInterval(async () => {
      try {
        const group = await fetchTripGroup(pollingTripId)
        setDetail((prev) => ({ ...prev, ...group }))
        if (group.status === 'GENERATING') {
          navigate(`/trips/${pollingTripId}/itineraries`, { replace: true })
        }
      } catch {
        // keep polling silently
      }
    }, JOIN_POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [detail?.tripId, isExpired, navigate, submitted])

  const requiredReady = themes.length > 0

  const leaderTheme = useMemo(() => {
    if (!detail?.travelTheme?.length) return '-'
    return detail.travelTheme.join(', ')
  }, [detail?.travelTheme])

  return (
    <main className="home-shell">
      <div className="planit-trip group-flow">
        <div className="page">
          <header className="topbar">
            <h1>그룹 참여</h1>
            <button className="pill-button" type="button" onClick={() => navigate('/')}>
              홈으로
            </button>
          </header>

          {toast && <div className="toast">{toast}</div>}

          {loading ? (
            <section className="section">
              <p>초대 정보를 불러오는 중입니다...</p>
            </section>
          ) : error ? (
            <section className="section">
              <p className="helper warning">{error}</p>
            </section>
          ) : isExpired ? (
            <section className="section">
              <h2>초대 만료</h2>
              <p className="helper warning">초대 코드는 생성 후 24시간까지만 유효합니다.</p>
            </section>
          ) : submitted ? (
            <section className="section">
              <h2>제출 완료</h2>
              <p>팀장님이 일정 생성을 시작하면 자동으로 다음 단계로 이동합니다.</p>
              <p className="group-muted">
                현재 상태: {detail?.status ?? 'WAITING'} ({detail?.submittedCount ?? 0}/{detail?.headCount ?? 0})
              </p>
            </section>
          ) : (
            <>
              <section className="section">
                <h2>팀장 입력값 (읽기 전용)</h2>
                <div className="field">
                  <label>여행 제목</label>
                  <input type="text" value={detail?.title ?? ''} readOnly />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>여행지</label>
                    <input type="text" value={detail?.travelCity ?? ''} readOnly />
                  </div>
                  <div className="field">
                    <label>인원수(팀장 포함)</label>
                    <input type="text" value={detail?.headCount ?? ''} readOnly />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>가는 날</label>
                    <input type="text" value={detail?.arrivalDate ?? ''} readOnly />
                  </div>
                  <div className="field">
                    <label>오는 날</label>
                    <input type="text" value={detail?.departureDate ?? ''} readOnly />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>도착 시각</label>
                    <input type="text" value={detail?.arrivalTime ?? ''} readOnly />
                  </div>
                  <div className="field">
                    <label>출발 시각</label>
                    <input type="text" value={detail?.departureTime ?? ''} readOnly />
                  </div>
                </div>
                <div className="field">
                  <label>팀장 선호 테마</label>
                  <input type="text" value={leaderTheme} readOnly />
                </div>
              </section>

              <section className="section">
                <div className="section-title">
                  내 선호 테마 (복수 선택 가능)<span className="required">*</span>
                </div>
                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={`theme-chip ${themes.includes(theme) ? 'active' : ''}`}
                      onClick={() =>
                        setThemes((prev) =>
                          prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme],
                        )
                      }
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </section>

              <section className="section">
                <label>희망 장소</label>
                <PlaceSearchPanel
                  initialDestinationCode={
                    detail?.destinationCode ??
                    (detail?.travelCity ? DESTINATION_CODE_BY_LABEL[detail.travelCity] ?? '' : '')
                  }
                  onPlaceSelected={(place: PlaceSearchItem) => {
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
                        },
                      ]
                    })
                  }}
                />
                {wantedPlaces.length > 0 && (
                  <div className="place-list">
                    {wantedPlaces.map((place) => (
                      <div key={place.id} className="place-item">
                        <div>
                          <strong>{place.name}</strong>
                          <p className="helper-text">{place.address}</p>
                        </div>
                        <button
                          className="remove"
                          type="button"
                          onClick={() =>
                            setWantedPlaces((prev) => prev.filter((item) => item.googlePlaceId !== place.googlePlaceId))
                          }
                        >
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
                  type="button"
                  disabled={!requiredReady || submitting}
                  onClick={async () => {
                    if (!requiredReady || submitting || !inviteCode) {
                      return
                    }
                    try {
                      setSubmitting(true)
                      setError('')
                      const response = await submitGroupJoin(inviteCode, {
                        travelTheme: themes,
                        wantedPlace: wantedPlaces.map((item) => item.googlePlaceId),
                      })
                      setDetail((prev) => ({ ...prev, ...response }))
                      if (response.status === 'GENERATING' && response.tripId) {
                        navigate(`/trips/${response.tripId}/itineraries`, { replace: true })
                        return
                      }
                      setSubmitted(true)
                      showToast('제출이 완료되었습니다.')
                    } catch (submitError) {
                      setError(getErrorMessage(submitError) || '제출에 실패했습니다. 잠시 후 다시 시도해주세요.')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  {submitting ? '제출 중...' : '입력 제출'}
                </button>
                {!requiredReady && <p className="helper warning">※ 테마를 하나 이상 선택해주세요.</p>}
                {error && <p className="helper warning">{error}</p>}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
