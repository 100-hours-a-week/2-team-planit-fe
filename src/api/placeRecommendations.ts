import api from './axios'

export type PlaceSearchResult = {
  placeId: number
  name: string
  city: string
  country?: string
  googlePlaceId: string
  thumbnailUrl?: string
}

export async function searchPlaceRecommendations(query: string): Promise<PlaceSearchResult[]> {
  const response = await api.get<{ data: PlaceSearchResult[] }>('/place-recommendations/search', {
    params: { q: query },
  })
  return response.data?.data ?? []
}

export type PlaceDetail = {
  placeId: number
  name: string
  city: string
  country: string
  photoUrl?: string
  googleMapsUrl?: string
}

export async function getPlaceDetail(placeId: string): Promise<PlaceDetail> {
  const response = await api.get<{ data: PlaceDetail }>(`/place-recommendations/places/${placeId}`)
  return response.data?.data ?? {
    placeId: Number(placeId) || 0,
    name: '',
    city: '',
    country: '',
  }
}
