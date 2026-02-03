import api from './axios'

export type NotificationType = 'KEYWORD' | 'COMMENT' | 'LIKE'

export interface NotificationItem {
  notificationId: number
  type: NotificationType
  postId: number
  actorName?: string | null
  previewText: string
  isRead: boolean
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  unreadCount: number
  nextCursor?: number | null
}

export interface NotificationUnreadCountResponse {
  unreadCount: number
}

const BASE_PATH = '/notifications'

export interface NotificationListParams {
  cursor?: number
  size?: number
  isRead?: boolean
}

export async function getNotifications(params?: NotificationListParams): Promise<NotificationListResponse> {
  const response = await api.get<NotificationListResponse>(BASE_PATH, { params })
  return response.data
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await api.patch(`${BASE_PATH}/${notificationId}/read`)
}

export async function getUnreadNotificationCount(): Promise<NotificationUnreadCountResponse> {
  const response = await api.get<NotificationUnreadCountResponse>(`${BASE_PATH}/unread-count`)
  return response.data
}
