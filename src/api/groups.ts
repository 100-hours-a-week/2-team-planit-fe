import api from './'

type ApiEnvelope<T> = {
  message?: string
  data?: T
}

export type GroupStatus = 'WAITING' | 'GENERATING' | 'SUCCESS' | 'FAIL' | string

export type GroupWaitingResponse = {
  tripId?: number
  inviteCode?: string
  submittedCount?: number
  headCount?: number
  status?: GroupStatus
  expiresAt?: string | null
}

export type GroupJoinDetailResponse = {
  tripId?: number
  title?: string
  travelCity?: string
  destinationCode?: string
  arrivalDate?: string
  departureDate?: string
  arrivalTime?: string
  departureTime?: string
  totalBudget?: number
  headCount?: number
  submittedCount?: number
  status?: GroupStatus
  expiresAt?: string | null
  travelTheme?: string[]
}

export type GroupJoinSubmitPayload = {
  travelTheme: string[]
  wantedPlace: string[]
}

export async function fetchTripWaiting(tripId: number | string): Promise<GroupWaitingResponse> {
  const response = await api.get<ApiEnvelope<GroupWaitingResponse>>(`/trips/${tripId}/waiting`)
  return response.data?.data ?? {}
}

export async function fetchGroupJoin(inviteCode: string): Promise<GroupJoinDetailResponse> {
  const response = await api.get<ApiEnvelope<GroupJoinDetailResponse>>(`/groups/join/${inviteCode}`)
  return response.data?.data ?? {}
}

export async function submitGroupJoin(
  inviteCode: string,
  payload: GroupJoinSubmitPayload,
): Promise<GroupJoinDetailResponse> {
  const response = await api.post<ApiEnvelope<GroupJoinDetailResponse>>(
    `/groups/join/${inviteCode}/submit`,
    payload,
  )
  return response.data?.data ?? {}
}
