import type { PlaceSearchItem } from '../types/place'

type SelectedPlaceCardProps = {
  place: PlaceSearchItem | null
}

export default function SelectedPlaceCard({ place }: SelectedPlaceCardProps) {
  if (!place) return null

  return (
    <div className="selected-place-card">
      <div>
        <strong>{place.name}</strong>
        <p>{place.address}</p>
        <p className="selected-place-meta">
          좌표: {place.marker.lat}, {place.marker.lng}
        </p>
      </div>
      <a
        className="text-link"
        href={place.googleMapUrl}
        target="_blank"
        rel="noreferrer"
      >
        Google 지도 열기
      </a>
    </div>
  )
}
