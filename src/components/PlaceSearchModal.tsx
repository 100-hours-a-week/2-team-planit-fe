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
        console.debug('place search request', trimmedQuery)
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

  const emptyState = useMemo(() => !loading && !error && results.length === 0 && query.trim().length > 0, [loading, error, results, query])

  if (!open) {
    return null
  }

  return (
    <div className="place-search-modal">
      <div className="place-search-modal__backdrop" onClick={onClose} />
      <div className="place-search-modal__panel" role="dialog" aria-modal="true">
        <header className="place-search-modal__header">
          <h2>장소 검색</h2>
          <button type="button" className="place-search-modal__close" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="place-search-modal__search">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 서울, 오사카 등"
            aria-label="장소 검색어"
          />
        </div>
        <div className="place-search-modal__body">
          {loading && <p className="place-search-modal__message">검색 중...</p>}
          {error && <p className="place-search-modal__message place-search-modal__message--error">{error}</p>}
          {emptyState && <p className="place-search-modal__message">검색 결과가 없습니다.</p>}
          <ul className="place-search-modal__list">
            {results.map((place) => (
              <li key={place.googlePlaceId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(place)
                    onClose()
                  }}
                >
                  <strong>{place.name}</strong>
                  <span>{place.addressText}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
