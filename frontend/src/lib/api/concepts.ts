import { apiClient } from './client'
import type { Concept, KnowledgeGraph, PaginatedResponse } from '@/types'

export const conceptsApi = {
  list: (params?: { difficulty?: string; category?: string; search?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Concept>>('/concepts/', { params }),

  detail: (id: string) => apiClient.get<Concept>(`/concepts/${id}/`),

  knowledgeGraph: () => apiClient.get<KnowledgeGraph>('/concepts/knowledge-graph/'),
}
