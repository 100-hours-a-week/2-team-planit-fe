import api from './'

export type TripActivity = {
  activityId?: number
  startTime?: string
  type?: string
  cost?: number
  placeName?: string
  transport?: string
  googleMapUrl?: string
  memo?: string
  durationMinutes?: number
}

export type TripItinerary = {
  day: number
  dayId?: number
  itineraryDayId?: number
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

export async function fetchMyItineraries(): Promise<TripData> {
  const response = await api.get<TripApiResponse>('/trips/itineraries')
  return response.data?.data ?? {}
}

export async function deleteTrip(): Promise<void> {
  await api.delete('/trips')
}

export type UpdateTripPlace = {
  activityId: number
  placeName?: string
  startTime?: string
  durationMinutes?: number
  cost?: number
  memo?: string
}

export async function updateTripDay(
  dayId: number,
  places: UpdateTripPlace[],
): Promise<void> {
  await api.patch('/trips/itineraries/days', { dayId, places })
}
