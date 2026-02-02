import api from './'

export type TripActivity = {
  activityId?: number
  startTime?: string
  type?: string
  cost?: number
  placeName?: string
  transport?: string
  googleMapUrl?: string
}

export type TripItinerary = {
  day: number
  activities: TripActivity[]
}

export type TripData = {
  tripId?: number
  itineraries?: TripItinerary[]
}

type TripApiResponse = {
  data?: TripData
}

export type CreateTripPayload = {
  title: string
  arrivalDate: string
  arrivalTime: string
  departureDate: string
  departureTime: string
  travelCity: string
  totalBudget: number
  travelTheme: string[]
  wantedPlace: string[]
}

export async function createTrip(payload: CreateTripPayload): Promise<TripData> {
  const response = await api.post<TripApiResponse>('/trips', payload)
  return response.data?.data ?? {}
}

export async function fetchTripItineraries(tripId: number): Promise<TripData> {
  const response = await api.get<TripApiResponse>(`/trips/${tripId}/itineraries`)
  return response.data?.data ?? {}
}
