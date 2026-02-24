import api from './axios'

export interface PlaceSearchResult {
  googlePlaceId?: string
  placeId?: string
  name: string
  addressText: string
  description?: string
  city?: string
}

const BASE_PATH = '/place-recommendations'

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const response = await api.get<PlaceSearchResult[]>(`${BASE_PATH}/search`, {
    params: { query },
  })
  return response.data
}

export interface PlaceDetail {
  googlePlaceId: string
  name: string
  city: string
  country: string
  photoUrl?: string | null
  googleMapsUrl: string
}

export async function getPlaceDetail(googlePlaceId: string): Promise<PlaceDetail> {
  const response = await api.get<PlaceDetail>(`${BASE_PATH}/places/${googlePlaceId}`)
  return response.data
}
