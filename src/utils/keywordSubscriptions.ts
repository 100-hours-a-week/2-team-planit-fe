import type { KeywordSubscription } from '../api/keywords'

const STORAGE_KEY = 'keywordSubscriptions'
export const KEYWORD_SUBSCRIPTIONS_EVENT = 'keyword-subscriptions:changed'

const isBrowser = typeof window !== 'undefined'

export function persistKeywordSubscriptions(subscriptions: KeywordSubscription[]) {
  if (!isBrowser) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions))
    window.dispatchEvent(
      new CustomEvent(KEYWORD_SUBSCRIPTIONS_EVENT, { detail: subscriptions }),
    )
  } catch {
    // ignore storage issues
  }
}

export function loadPersistedKeywordSubscriptions(): KeywordSubscription[] | null {
  if (!isBrowser) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}
