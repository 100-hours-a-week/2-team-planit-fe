import api from './'

/** Presigned URL 발급 응답 (프로필/게시물 공통) */
export interface PresignedUrlResponse {
  /** S3로 PUT할 presigned URL */
  uploadUrl: string
  key: string
  expiresAt: string
}

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

/** 프로필 이미지 Presigned URL 발급 (확장자: jpg, jpeg, png, webp) */
export async function getProfilePresignedUrl(
  fileExtension: string,
  contentType?: string,
): Promise<PresignedUrlResponse> {
  const response = await api.post<PresignedUrlResponse>(
    '/users/profile-image/presigned-url',
    { fileExtension, contentType: contentType ?? 'image/jpeg' },
  )
  return response.data
}

/** 회원가입 시 프로필 이미지 Presigned URL 발급 (비인증). 업로드 후 signup 시 profileImageKey로 전달 */
export async function getSignupProfilePresignedUrl(
  fileExtension: string,
  contentType?: string,
): Promise<PresignedUrlResponse> {
  const response = await api.post<PresignedUrlResponse>(
    '/users/signup/profile-image/presigned-url',
    { fileExtension, contentType: contentType ?? 'image/jpeg' },
  )
  return response.data
}

/** 회원가입 화면에서 이미지 교체/삭제 시 S3 객체 삭제 (비인증). signup/ prefix key만 허용 */
export async function deleteSignupProfileImageByKey(key: string): Promise<void> {
  await api.delete('/users/signup/profile-image', { params: { key } })
}

/** Presigned URL로 S3 업로드 완료 후 프로필 이미지 key 저장 */
export async function saveProfileImageKey(key: string): Promise<UserProfileResponse> {
  const response = await api.put<UserProfileResponse>('/users/me/profile-image', { key })
  return response.data
}

/** 프로필 이미지 삭제 */
export async function deleteProfileImage(): Promise<UserProfileResponse> {
  const response = await api.delete<UserProfileResponse>('/users/me/profile-image')
  return response.data
}
