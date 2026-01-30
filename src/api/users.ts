import api from './'

export interface UserAvailabilityResponse {
  available: boolean
  message: string
}

export async function checkLoginId(loginId: string): Promise<UserAvailabilityResponse> {
  const response = await api.get<UserAvailabilityResponse>('/users/check-login-id', {
    params: { loginId },
  })
  return response.data
}

export async function checkNickname(nickname: string): Promise<UserAvailabilityResponse> {
  const response = await api.get<UserAvailabilityResponse>('/users/check-nickname', {
    params: { nickname },
  })
  return response.data
}

export interface PlanPreview {
  postId: number
  title: string
  status: string
  boardType: string
}

export interface MyPageResponse {
  userId: number
  loginId: string
  nickname: string
  profileImageId: number | null
  profileImageUrl?: string | null
  postCount: number
  commentCount: number
  likeCount: number
  notificationCount: number
  planPreviews: PlanPreview[]
}

export async function getMyPage(): Promise<MyPageResponse> {
  const response = await api.get<MyPageResponse>('/users/me/mypage')
  return response.data
}

export interface UserProfileResponse {
  userId: number
  loginId: string
  nickname: string
  profileImageId: number | null
  profileImageUrl?: string | null
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  const response = await api.get<UserProfileResponse>('/users/me')
  return response.data
}

export interface UserUpdateRequest {
  nickname: string
  password?: string
  passwordConfirmation?: string
  profileImageId?: number | null
}

export async function updateProfile(payload: UserUpdateRequest): Promise<UserProfileResponse> {
  const response = await api.put<UserProfileResponse>('/users/me', payload)
  return response.data
}

export async function withdrawUser(): Promise<void> {
  await api.delete('/users/me')
}
