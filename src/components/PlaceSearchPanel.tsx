import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import PlaceResultList from './PlaceResultList'
import SelectedPlaceCard from './SelectedPlaceCard'
import { searchPlaces } from '../services/placeApi'
import type { PlaceSearchItem } from '../types/place'

type PlaceSearchPanelProps = {
  initialDestinationCode?: string
  onPlaceSelected: (place: PlaceSearchItem) => void
}

const DESTINATION_OPTIONS = [
  { label: '가오슝, 대만', value: 'KAOHSIUNG_TW' },
  { label: '괌, 미국', value: 'GUAM_US' },
  { label: '나고야, 일본', value: 'NAGOYA_JP' },
  { label: '나트랑, 베트남', value: 'NHA_TRANG_VN' },
  { label: '다낭, 베트남', value: 'DA_NANG_VN' },
  { label: '도쿄, 일본', value: 'TOKYO_JP' },
  { label: '런던, 영국', value: 'LONDON_GB' },
  { label: '로마, 이탈리아', value: 'ROME_IT' },
  { label: '마닐라, 필리핀', value: 'MANILA_PH' },
  { label: '마카오, 중국', value: 'MACAU_CN' },
  { label: '바르셀로나, 스페인', value: 'BARCELONA_ES' },
  { label: '방콕, 태국', value: 'BANGKOK_TH' },
  { label: '보라카이, 필리핀', value: 'BORACAY_PH' },
  { label: '보홀, 필리핀', value: 'BOHOL_PH' },
  { label: '사이판, 미국', value: 'SAIPAN_US' },
  { label: '삿포로, 일본', value: 'SAPPORO_JP' },
  { label: '상하이, 중국', value: 'SHANGHAI_CN' },
  { label: '세부, 필리핀', value: 'CEBU_PH' },
  { label: '싱가포르, 싱가포르', value: 'SINGAPORE_SG' },
  { label: '오사카, 일본', value: 'OSAKA_JP' },
  { label: '오키나와, 일본', value: 'OKINAWA_JP' },
  { label: '치앙마이, 태국', value: 'CHIANG_MAI_TH' },
  { label: '코타키나발루, 말레이시아', value: 'KOTA_KINABALU_MY' },
  { label: '쿠알라룸푸르, 말레이시아', value: 'KUALA_LUMPUR_MY' },
  { label: '타이베이, 대만', value: 'TAIPEI_TW' },
  { label: '파리, 프랑스', value: 'PARIS_FR' },
  { label: '푸꾸옥, 베트남', value: 'PHU_QUOC_VN' },
  { label: '하노이, 베트남', value: 'HANOI_VN' },
  { label: '홍콩, 중국', value: 'HONG_KONG_CN' },
  { label: '후쿠오카, 일본', value: 'FUKUOKA_JP' },
] as const

export default function PlaceSearchPanel({ initialDestinationCode, onPlaceSelected }: PlaceSearchPanelProps) {
  const [destinationCode, setDestinationCode] = useState(initialDestinationCode ?? '')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<PlaceSearchItem[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchItem | null>(null)

  useEffect(() => {
    setDestinationCode(initialDestinationCode ?? '')
  }, [initialDestinationCode])

  const canSearch = destinationCode && query.trim().length > 0 && !loading

  const handleSearch = async () => {
    if (!destinationCode) {
      setError('여행지를 먼저 선택해주세요.')
      return
    }
    if (!query.trim()) {
      setError('검색어를 입력해주세요.')
      return
    }
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const result = await searchPlaces({
        destinationCode,
        query: query.trim(),
      })
      setItems(result)
      if (result.length === 0) {
        setSelectedPlace(null)
      }
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(code || '장소 검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearch()
    }
  }

  const selectedLabel = useMemo(() => {
    return DESTINATION_OPTIONS.find((option) => option.value === destinationCode)?.label ?? ''
  }, [destinationCode])

  return (
    <div className="place-search-panel">
      <div className="place-search-row">
        <label className="place-label">여행지</label>
        <input
          type="text"
          value={selectedLabel || '여행지를 선택해주세요'}
          readOnly
          aria-label="여행지"
        />
      </div>

      <div className="place-search-row">
        <label className="place-label">검색어</label>
        <div className="place-search-input">
          <input
            type="text"
            placeholder={selectedLabel ? `${selectedLabel}에서 검색` : '검색어를 입력하세요'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="장소 검색어"
          />
          <button type="button" className="primary-btn small" onClick={handleSearch} disabled={!canSearch}>
            검색
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <PlaceResultList
        items={items}
        onPreview={(item) => setSelectedPlace(item)}
        onSelect={(item) => {
          onPlaceSelected(item)
          setSelectedPlace(item)
        }}
        disabled={loading}
      />

      <SelectedPlaceCard place={selectedPlace} />
    </div>
  )
}
