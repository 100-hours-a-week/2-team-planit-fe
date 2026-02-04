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

/** Presigned URL 발급 (프론트가 S3에 직접 업로드용) */
export interface PresignedUrlRequest {
  fileExtension: string
  contentType?: string
}

export interface PresignedUrlResponse {
  uploadUrl: string
  key: string
  expiresAt: string
}

export async function getProfilePresignedUrl(
  request: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
  const response = await api.post<PresignedUrlResponse>('/users/profile-image/presigned-url', request)
  return response.data
}

/** Presigned URL로 업로드 완료 후 key 저장 */
export async function saveProfileImageKey(key: string): Promise<UserProfileResponse> {
  const response = await api.put<UserProfileResponse>('/users/me/profile-image', { key })
  return response.data
}

/** 프로필 이미지 삭제 */
export async function deleteProfileImage(): Promise<UserProfileResponse> {
  const response = await api.delete<UserProfileResponse>('/users/me/profile-image')
  return response.data
}

export async function withdrawUser(): Promise<void> {
  await api.delete('/users/me')
}