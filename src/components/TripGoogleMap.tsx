import { useEffect, useMemo, useRef, useState } from 'react'

type GoogleMapPoint = {
  id: string
  name: string
  lat: number
  lng: number
}

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds) => void
  setCenter: (latLng: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
}

type GoogleMarkerInstance = {
  setMap: (map: GoogleMapInstance | null) => void
}

type GooglePolylineInstance = {
  setMap: (map: GoogleMapInstance | null) => void
}

type GoogleLatLngBounds = {
  extend: (latLng: { lat: number; lng: number }) => void
}

type GooglePlacesService = {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (
      place: {
        place_id?: string
        name?: string
        geometry?: {
          location?: {
            lat: () => number
            lng: () => number
          }
        }
      } | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance
    Polyline: new (options: Record<string, unknown>) => GooglePolylineInstance
    LatLngBounds: new () => GoogleLatLngBounds
    places: {
      PlacesService: new (element: HTMLDivElement) => GooglePlacesService
      PlacesServiceStatus: {
        OK: string
      }
    }
  }
}

type WindowWithGoogleMaps = Window & typeof globalThis & { google?: GoogleMapsApi }

type TripGoogleMapProps = {
  placeIds: string[]
  expanded?: boolean
}

let googleMapsScriptPromise: Promise<void> | null = null

const getGoogleMapsApi = () => (window as WindowWithGoogleMaps).google

const loadGoogleMapsPlacesScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is unavailable'))
  }

  const existingGoogle = getGoogleMapsApi()
  if (existingGoogle?.maps?.places) {
    return Promise.resolve()
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise
  }

  const apiKey = (import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined)?.trim()
  if (!apiKey) {
    return Promise.reject(new Error('missing api key'))
  }

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-places]')
    if (existingScript) {
      const handleLoad = () => resolve()
      const handleError = () => reject(new Error('google maps script failed'))
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.googlePlaces = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google maps script failed'))
    document.head.appendChild(script)
  })

  return googleMapsScriptPromise
}

export default function TripGoogleMap({ placeIds, expanded = false }: TripGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null)
  const markersRef = useRef<GoogleMarkerInstance[]>([])
  const polylineRef = useRef<GooglePolylineInstance | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [points, setPoints] = useState<GoogleMapPoint[]>([])

  const uniquePlaceIds = useMemo(
    () => Array.from(new Set(placeIds.map((item) => item.trim()).filter(Boolean))),
    [placeIds],
  )

  useEffect(() => {
    let isMounted = true

    loadGoogleMapsPlacesScript()
      .then(() => {
        if (!isMounted) return
        setMapsReady(true)
        setErrorMessage('')
      })
      .catch(() => {
        if (!isMounted) return
        setMapsReady(false)
        setErrorMessage('지도를 불러오지 못했습니다.')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!mapsReady) return
    if (uniquePlaceIds.length === 0) {
      return
    }

    const google = getGoogleMapsApi()
    if (!google?.maps?.places) {
      queueMicrotask(() => {
        setPoints([])
        setErrorMessage('지도를 불러오지 못했습니다.')
      })
      return
    }

    let isMounted = true
    const service = new google.maps.places.PlacesService(document.createElement('div'))

    Promise.all(
      uniquePlaceIds.map(
        (placeId) =>
          new Promise<GoogleMapPoint | null>((resolve) => {
            service.getDetails(
              {
                placeId,
                fields: ['place_id', 'name', 'geometry'],
              },
              (place, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                  resolve(null)
                  return
                }

                const lat = place?.geometry?.location?.lat?.()
                const lng = place?.geometry?.location?.lng?.()

                if (typeof lat !== 'number' || typeof lng !== 'number') {
                  resolve(null)
                  return
                }

                resolve({
                  id: place?.place_id || placeId,
                  name: place?.name || '장소',
                  lat,
                  lng,
                })
              },
            )
          }),
      ),
    ).then((resolvedPoints) => {
      if (!isMounted) return
      const nextPoints = resolvedPoints.filter((item): item is GoogleMapPoint => Boolean(item))
      setPoints(nextPoints)
      if (nextPoints.length === 0) {
        setErrorMessage('지도에 표시할 장소 정보가 없습니다.')
        return
      }
      setErrorMessage('')
    })

    return () => {
      isMounted = false
    }
  }, [mapsReady, uniquePlaceIds])

  useEffect(() => {
    const google = getGoogleMapsApi()
    const mapElement = mapRef.current
    if (!mapsReady || !google?.maps || !mapElement) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapElement, {
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: expanded ? 'greedy' : 'cooperative',
        zoomControl: expanded,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      })
    }

    const map = mapInstanceRef.current
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    polylineRef.current?.setMap(null)
    polylineRef.current = null

    if (points.length === 0) {
      return
    }

    const bounds = new google.maps.LatLngBounds()
    const path = points.map((point) => ({ lat: point.lat, lng: point.lng }))

    markersRef.current = points.map(
      (point, index) =>
        new google.maps.Marker({
          map,
          position: { lat: point.lat, lng: point.lng },
          title: point.name,
          label: points.length > 1 ? String(index + 1) : undefined,
        }),
    )

    path.forEach((point) => bounds.extend(point))

    if (path.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor: '#f2c200',
        strokeOpacity: 0.85,
        strokeWeight: expanded ? 5 : 4,
      })
    }

    map.fitBounds(bounds)
    if (path.length === 1) {
      map.setCenter(path[0])
      map.setZoom(expanded ? 15 : 14)
    }
  }, [expanded, mapsReady, points])

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      polylineRef.current?.setMap(null)
      markersRef.current = []
      polylineRef.current = null
    }
  }, [])

  if (errorMessage) {
    return (
      <div className={`trip-google-map trip-google-map--fallback${expanded ? ' is-expanded' : ''}`}>
        <div className="trip-google-map__message">
          <strong>지도를 표시할 수 없습니다</strong>
          <span>{errorMessage}</span>
        </div>
      </div>
    )
  }

  if (uniquePlaceIds.length === 0) {
    return (
      <div className={`trip-google-map trip-google-map--fallback${expanded ? ' is-expanded' : ''}`}>
        <div className="trip-google-map__message">
          <strong>표시할 장소가 없습니다</strong>
          <span>해당 일자의 일정에 장소 정보가 아직 없습니다.</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`trip-google-map${expanded ? ' is-expanded' : ''}`}>
      <div ref={mapRef} className="trip-google-map__canvas" />
    </div>
  )
}
