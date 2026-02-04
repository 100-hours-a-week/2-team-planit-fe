import axios from 'axios'
import { authStore } from '../store'

const baseURL = 'https://planit-ai.store/login'

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
    const headers = config.headers ?? {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    config.headers = headers
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
