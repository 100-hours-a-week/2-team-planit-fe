import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTripWaiting, type GroupWaitingResponse } from '../api/groups'
import './GroupFlowPage.css'

const WAITING_POLL_INTERVAL_MS = 3000

const getStatusLabel = (status?: string) => {
  if (status === 'WAITING') return '대기중'
  if (status === 'GENERATING') return '일정 생성중'
  if (status === 'SUCCESS') return '생성 완료'
  if (status === 'FAIL') return '생성 실패'
  if (status === 'EXPIRED') return '초대 만료'
  return status || '-'
}

const getErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message

export default function TripWaitingPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const [waiting, setWaiting] = useState<GroupWaitingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const numericTripId = Number(tripId)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const loadWaiting = useCallback(async (silent = false) => {
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setError('올바른 여행 정보가 아닙니다.')
      setLoading(false)
      return
    }
    try {
      const data = await fetchTripWaiting(numericTripId)
      setWaiting(data)
      if (!silent) {
        setError('')
      }
    } catch (loadError) {
      if (!silent) {
        setError(getErrorMessage(loadError) || '대기방 정보를 불러오지 못했습니다.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [numericTripId])

  useEffect(() => {
    void loadWaiting()
  }, [loadWaiting])

  useEffect(() => {
    if (!waiting?.status) return
    if (waiting.status === 'GENERATING') {
      navigate(`/trips/${numericTripId}/itineraries`, { replace: true })
    }
  }, [numericTripId, navigate, waiting?.status])

  useEffect(() => {
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) return
    const intervalId = window.setInterval(() => {
      void loadWaiting(true)
    }, WAITING_POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadWaiting, numericTripId])

  const inviteLink = useMemo(() => {
    if (!waiting?.inviteCode) return ''
    return `${window.location.origin}/groups/join/${waiting.inviteCode}`
  }, [waiting?.inviteCode])

  const isExpiredByDate = Boolean(waiting?.expiresAt && new Date(waiting.expiresAt).getTime() <= Date.now())
  const isExpired = waiting?.status === 'EXPIRED' || isExpiredByDate

  return (
    <main className="home-shell">
      <div className="planit-trip group-flow">
        <div className="page">
          <header className="topbar">
            <h1>그룹 대기방</h1>
            <button className="pill-button" type="button" onClick={() => navigate('/')}>
              홈으로
            </button>
          </header>

          {toast && <div className="toast">{toast}</div>}

          {loading ? (
            <section className="section">
              <p>대기방 정보를 불러오는 중입니다...</p>
            </section>
          ) : error ? (
            <section className="section">
              <p className="helper warning">{error}</p>
            </section>
          ) : (
            <>
              <section className="section">
                <h2>초대 코드</h2>
                <div className="field">
                  <label>Invite Code</label>
                  <input type="text" value={waiting?.inviteCode ?? ''} readOnly />
                </div>
                <div className="field">
                  <label>초대 링크</label>
                  <input type="text" value={inviteLink} readOnly />
                </div>
                <div className="group-actions">
                  <button
                    className="pill-button"
                    type="button"
                    disabled={!inviteLink}
                    onClick={async () => {
                      if (!inviteLink) return
                      try {
                        await navigator.clipboard.writeText(inviteLink)
                        showToast('초대 링크를 복사했습니다.')
                      } catch {
                        showToast('복사에 실패했습니다.')
                      }
                    }}
                  >
                    링크 복사
                  </button>
                  {waiting?.status === 'WAITING' && (
                    <button
                      className="pill-button"
                      type="button"
                      onClick={() => showToast('수정 기능은 대기방 단계에서만 노출됩니다.')}
                    >
                      수정
                    </button>
                  )}
                </div>
                {isExpired && (
                  <p className="helper warning">
                    초대 코드가 만료되었습니다. 초대 코드는 생성 후 24시간 동안만 유효합니다.
                  </p>
                )}
              </section>

              <section className="section">
                <h2>진행 상태</h2>
                <div className="waiting-status-grid">
                  <div>
                    <p className="group-label">상태</p>
                    <strong>{getStatusLabel(waiting?.status)}</strong>
                  </div>
                  <div>
                    <p className="group-label">제출 인원</p>
                    <strong>
                      {waiting?.submittedCount ?? 0} / {waiting?.headCount ?? 0}
                    </strong>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
