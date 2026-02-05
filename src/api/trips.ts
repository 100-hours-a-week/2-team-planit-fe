import api from './'

type ApiEnvelope<T> = {
  message?: string
  data?: T
}

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
  title?: string
  startDate?: string
  endDate?: string
  isOwner?: boolean
  itineraries?: TripItinerary[]
}

export type TripListItem = {
  tripId: number
  title: string
  startDate: string
  endDate: string
  travelCity: string
}

type TripsPayload = {
  trips: TripListItem[]
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
  const response = await api.post<ApiEnvelope<TripData>>('/trips', payload)
  return response.data?.data ?? {}
}

export async function fetchTripItineraries(tripId: number): Promise<TripData> {
  const response = await api.get<ApiEnvelope<TripData>>(`/trips/${tripId}/itineraries`)
  return response.data?.data ?? {}
}

export async function fetchTrips(): Promise<TripListItem[]> {
  const response = await api.get<ApiEnvelope<TripsPayload>>('/trips')
  return response.data?.data?.trips ?? []
}

export async function deleteTrip(tripId: number): Promise<void> {
  await api.delete(`/trips/${tripId}`)
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
  tripId: number,
  dayId: number,
  places: UpdateTripPlace[],
): Promise<void> {
  await api.patch('/trips/itineraries/days', { tripId, dayId, places })
}
