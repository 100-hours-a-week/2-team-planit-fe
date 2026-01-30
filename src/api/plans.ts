import api from './'

export interface PlanPreview {
  planId: number
  title: string
  status: string
  boardType: string
  leader?: boolean
}

export async function fetchPlans(): Promise<PlanPreview[]> {
  const response = await api.get<PlanPreview[]>('/plans?mine=true')
  return response.data
}

export async function deletePlan(planId: number): Promise<void> {
  await api.delete(`/plans/${planId}`)
}
