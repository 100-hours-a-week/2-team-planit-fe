import type { PlaceSearchItem } from '../types/place'

type PlaceResultListProps = {
  items: PlaceSearchItem[]
  onSelect: (item: PlaceSearchItem) => void
  onPreview: (item: PlaceSearchItem) => void
  disabled?: boolean
}

export default function PlaceResultList({
  items,
  onSelect,
  onPreview,
  disabled = false,
}: PlaceResultListProps) {
  if (items.length === 0) {
    return <p className="place-empty">검색 결과가 없습니다.</p>
  }

  return (
    <ul className="place-results">
      {items.map((item) => (
        <li key={item.googlePlaceId} className="place-result-row">
          <div
            className="place-result-info"
            onClick={() => onPreview(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPreview(item)
              }
            }}
          >
            <strong>{item.name}</strong>
            <span>{item.address}</span>
          </div>
          <div className="place-result-actions">
            <button type="button" className="secondary-btn small" onClick={() => onPreview(item)} disabled={disabled}>
              상세보기
            </button>
            <button type="button" className="primary-btn small" onClick={() => onSelect(item)} disabled={disabled}>
              선택
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
