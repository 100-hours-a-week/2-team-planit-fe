import axios from 'axios'
import { authStore } from '../store'

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'https://planit-ai.store/api'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    window.location.assign('/login')
  }
}

api.interceptors.request.use(
  (config) => {
    const token = authStore.accessToken
    if (token) {
      config.headers?.set('Authorization', `Bearer ${token}`)
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const hasToken = Boolean(authStore.accessToken)
    if (status === 401 && hasToken) {
      authStore.clearAuth()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export default api