import api from './'

export interface LoginRequest {
  loginId: string
  password: string
}

export interface LoginResponse {
  userId: number
  loginId: string
  nickname: string
  accessToken: string
  profileImageUrl?: string | null
}

export interface SignupRequest {
  loginId: string
  password: string
  passwordConfirm: string
  nickname: string
  /** Presigned URL로 S3 업로드 완료 후 받은 key (선택) */
  profileImageKey?: string | null
}

export interface SignupResponse {
  success: boolean
  userId: string
}

export interface MeResponse {
  id: string
  name: string
  email: string
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', payload)
  const data = response.data
  return data
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const response = await api.post<SignupResponse>('/users/signup', payload)
  return response.data
}

export async function me(): Promise<MeResponse> {
  const response = await api.get<MeResponse>('/users/me')
  return response.data
}
