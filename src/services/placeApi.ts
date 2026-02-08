import api from '../api'
import type { PlaceSearchItem } from '../types/place'

type ApiEnvelope<T> = {
  message?: string
  data?: T
  error?: { code?: string; message?: string }
}

type PlaceSearchPayload = {
  destinationCode: string
  query: string
}

type PlaceSearchData = {
  items?: PlaceSearchItem[]
}

export async function searchPlaces(payload: PlaceSearchPayload): Promise<PlaceSearchItem[]> {
  const response = await api.post<ApiEnvelope<PlaceSearchData>>('/places/search', payload)
  return response.data?.data?.items ?? []
}
