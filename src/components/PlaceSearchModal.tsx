import { useEffect, useMemo, useState } from 'react'
import { searchPlaces, type PlaceSearchResult } from '../api/placeRecommendations'

interface PlaceSearchModalProps {
  open: boolean
  onClose: () => void
  onSelect: (place: PlaceSearchResult) => void
}

export default function PlaceSearchModal({ open, onClose, onSelect }: PlaceSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setError(null)
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!open || trimmedQuery.length === 0) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const handler = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const searchResult = await searchPlaces(trimmedQuery)
        setResults(searchResult)
      } catch (err) {
        console.error('Place search failed', err)
        setError('장소 검색에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(handler)
  }, [query, open])

  const emptyState = useMemo(
    () => !loading && !error && results.length === 0 && query.trim().length > 0,
    [loading, error, results, query],
  )

  if (!open) {
    return null
  }

  return (
    <div className="place-search-modal">
      <div className="place-search-modal__backdrop" onClick={onClose} />
      <div className="place-search-modal__panel" role="dialog" aria-modal="true">
        <div className="place-search-modal__header kakao-header">
          <div>
            <h2>장소 검색</h2>
            <p>구글 맵스 기반 장소를 찾아보세요.</p>
          </div>
          <button type="button" className="place-search-modal__close" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="place-search-modal__search">
          <span className="place-search-modal__search-icon">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 서울 성수동 카페"
            aria-label="장소 검색어"
          />
        </div>
        <div className="place-search-modal__body kakao-body">
          {loading && <p className="place-search-modal__message">검색 중...</p>}
          {error && <p className="place-search-modal__message place-search-modal__message--error">{error}</p>}
          {emptyState && <p className="place-search-modal__message">검색 결과가 없습니다.</p>}
          <ul className="place-search-modal__list">
            {results.map((place, index) => (
              <li
                key={place.googlePlaceId ?? place.placeId ?? place.description ?? `${index}`}
                className="place-search-modal__item"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(place)
                    onClose()
                  }}
                >
                  <div className="place-search-modal__item-header">
                    <strong>{place.name}</strong>
                    <span className="place-search-modal__item-distance">바로가기</span>
                  </div>
                  <p className="place-search-modal__item-address">{place.addressText}</p>
                  {place.description && <p className="place-search-modal__item-desc">{place.description}</p>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
