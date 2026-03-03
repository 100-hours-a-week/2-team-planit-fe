import api from './'

type ApiEnvelope<T> = {
  message?: string
  data?: T
}

export type TripChatMessage = {
  messageId?: number | string
  tripId?: number
  senderUserId?: number
  senderType?: string
  senderNickname?: string
  senderProfileImageUrl?: string | null
  content: string
  createdAt?: string
  seq?: number
}

type ChatMessagesPayload = {
  messages?: TripChatMessage[]
}

type ChatSummaryPayload = {
  unreadCount?: number
}

export const normalizeTripChatMessage = (raw: unknown): TripChatMessage | null => {
  const record = raw as Record<string, unknown>
  const content = typeof record.content === 'string' ? record.content.trim() : ''
  if (!content) return null

  return {
    messageId:
      typeof record.messageId === 'number' || typeof record.messageId === 'string'
        ? record.messageId
        : undefined,
    tripId: typeof record.tripId === 'number' ? record.tripId : undefined,
    senderUserId:
      typeof record.senderUserId === 'number'
        ? record.senderUserId
        : typeof record.senderId === 'number'
          ? record.senderId
          : undefined,
    senderType: typeof record.senderType === 'string' ? record.senderType : undefined,
    senderNickname: typeof record.senderNickname === 'string' ? record.senderNickname : undefined,
    senderProfileImageUrl:
      typeof record.senderProfileImageUrl === 'string'
        ? record.senderProfileImageUrl
        : record.senderProfileImageUrl === null
          ? null
          : undefined,
    content,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    seq: typeof record.seq === 'number' ? record.seq : undefined,
  }
}

export const normalizeTripChatMessages = (raw: unknown): TripChatMessage[] => {
  if (!Array.isArray(raw)) return []
  const normalized: TripChatMessage[] = []
  raw.forEach((item) => {
    const message = normalizeTripChatMessage(item)
    if (message) {
      normalized.push(message)
    }
  })
  return normalized
}

export const appendLimitedMessages = (messages: TripChatMessage[], limit = 50) =>
  messages.slice(Math.max(messages.length - limit, 0))

export async function fetchTripChatMessages(
  tripId: number | string,
  limit = 50,
): Promise<TripChatMessage[]> {
  const response = await api.get<ApiEnvelope<ChatMessagesPayload | TripChatMessage[]>>(
    `/trips/${tripId}/chat/messages`,
    { params: { limit } },
  )
  const data = response.data?.data
  if (Array.isArray(data)) {
    return normalizeTripChatMessages(data)
  }
  return normalizeTripChatMessages(data?.messages)
}

export async function fetchTripChatSummary(tripId: number | string): Promise<number> {
  const response = await api.get<ApiEnvelope<ChatSummaryPayload>>(`/trips/${tripId}/chat/summary`)
  const unreadCount = response.data?.data?.unreadCount
  return typeof unreadCount === 'number' && unreadCount > 0 ? unreadCount : 0
}

export async function markTripChatRead(tripId: number | string): Promise<void> {
  await api.post(`/trips/${tripId}/chat/read`)
}
