export type PlaceMarker = {
  lat: number
  lng: number
}

export type PlaceSearchItem = {
  googlePlaceId: string
  googleMapUrl: string
  name: string
  address: string
  marker: PlaceMarker
}
