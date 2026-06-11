import { apiClient } from './client'
import type { PaginatedResponse, SimulationResult, SimulationType } from '@/types'

export const simulationsApi = {
  run: (data: { simulation_type: SimulationType; parameters: Record<string, number | string> }) =>
    apiClient.post<SimulationResult>('/simulations/run/', data),

  result: (id: string) => apiClient.get<SimulationResult>(`/simulations/${id}/`),

  history: (params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<SimulationResult>>('/simulations/', { params }),
}
