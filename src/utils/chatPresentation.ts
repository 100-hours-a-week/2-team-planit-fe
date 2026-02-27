import type { TripChatMessage } from '../api/chat'

export type SenderNameCache = Record<number, string>
export type SenderProfileCache = Record<number, string>

export const buildSenderNameCache = (messages: TripChatMessage[]): SenderNameCache => {
  const cache: SenderNameCache = {}
  messages.forEach((message) => {
    if (!message.senderUserId || !message.senderNickname?.trim()) return
    cache[message.senderUserId] = message.senderNickname
  })
  return cache
}

export const buildSenderProfileCache = (messages: TripChatMessage[]): SenderProfileCache => {
  const cache: SenderProfileCache = {}
  messages.forEach((message) => {
    if (!message.senderUserId || !message.senderProfileImageUrl?.trim()) return
    cache[message.senderUserId] = message.senderProfileImageUrl
  })
  return cache
}

export const resolveSenderDisplayName = (
  message: TripChatMessage,
  nicknameCache: SenderNameCache,
) => {
  if (message.senderNickname?.trim()) return message.senderNickname
  if (message.senderUserId && nicknameCache[message.senderUserId]) {
    return nicknameCache[message.senderUserId]
  }
  return '알 수 없음'
}

export const resolveSenderProfileImageUrl = (
  message: TripChatMessage,
  profileCache: SenderProfileCache,
) => {
  if (message.senderProfileImageUrl?.trim()) return message.senderProfileImageUrl
  if (message.senderUserId && profileCache[message.senderUserId]) {
    return profileCache[message.senderUserId]
  }
  return ''
}
