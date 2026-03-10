import api from './axios'

export interface KeywordSubscription {
  id: number
  keyword: string
  createdAt: string
}

const BASE_PATH = '/keyword-subscriptions'

export async function fetchKeywordSubscriptions(): Promise<KeywordSubscription[]> {
  const response = await api.get<KeywordSubscription[] | { keywords?: KeywordSubscription[] }>(BASE_PATH)
  if (Array.isArray(response.data)) {
    return response.data
  }
  return response.data.keywords ?? []
}

export async function createKeywordSubscription(keyword: string): Promise<KeywordSubscription> {
  const response = await api.post<KeywordSubscription>(BASE_PATH, { keyword })
  return response.data
}

export async function deleteKeywordSubscription(subscriptionId: number): Promise<void> {
  await api.delete(`${BASE_PATH}/${subscriptionId}`)
}
