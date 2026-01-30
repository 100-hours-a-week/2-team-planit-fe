import React from 'react'

export type User = {
  id: number
  loginId: string
  nickname: string
  profileImageUrl?: string | null
}

type AuthState = {
  user: User | null
  accessToken: string | null
  setAuth: (payload: { user: User; accessToken: string | null }) => void
  clearAuth: () => void
  hydrate: () => void
}

const LS_KEY = 'auth'

export const authStore: AuthState = {
  user: null,
  accessToken: null,

  setAuth: ({ user, accessToken }) => {
    authStore.user = user
    authStore.accessToken = accessToken
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify({ user, accessToken }))
      window.dispatchEvent(new Event('auth:changed'))
    }
  },

  clearAuth: () => {
    authStore.user = null
    authStore.accessToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY)
      window.dispatchEvent(new Event('auth:changed'))
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined') {
      return
    }
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      return
    }
    try {
      const parsed = JSON.parse(raw)
      authStore.user = parsed?.user ?? null
      authStore.accessToken = parsed?.accessToken ?? null
    } catch {
      // ignore malformed cache
    }
  },
}

export function useAuth() {
  const [, force] = React.useState(0)

  React.useEffect(() => {
    const onChange = () => force((value) => value + 1)
    window.addEventListener('auth:changed', onChange)
    return () => window.removeEventListener('auth:changed', onChange)
  }, [])

  return {
    user: authStore.user,
    accessToken: authStore.accessToken,
    setAuth: authStore.setAuth,
    clearAuth: authStore.clearAuth,
    hydrate: authStore.hydrate,
  }
}
