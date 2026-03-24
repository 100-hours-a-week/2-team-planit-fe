type TripGoogleMapProps = {
  placeIds: string[]
  expanded?: boolean
}

const DEFAULT_CENTER = {
  lat: 41.3874,
  lng: 2.1686,
}

const buildEmbedUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`

export default function TripGoogleMap({ placeIds, expanded = false }: TripGoogleMapProps) {
  void placeIds

  return (
    <div className={`trip-google-map${expanded ? ' is-expanded' : ''}`}>
      <iframe
        className="trip-google-map__canvas"
        title="trip-map"
        src={buildEmbedUrl(DEFAULT_CENTER)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
