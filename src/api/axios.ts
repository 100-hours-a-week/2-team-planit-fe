import axios from 'axios'
import { authStore } from '../store'

const api = axios.create({
  baseURL: 'http://planit-ai.store/api',
  withCredentials: true,
})

api.interceptors.request.use(
  (config) => {
    const token = authStore.accessToken
    config.headers = config.headers ?? {}
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // 인증 실패 처리는 호출자(페이지 또는 특정 API)에서 제어합니다.
    }
    return Promise.reject(error)
  },
)

export default api
