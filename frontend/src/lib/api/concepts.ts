import { apiClient } from './client'
import type { Concept, KnowledgeGraph, PaginatedResponse } from '@/types'

export const conceptsApi = {
  list: (params?: { difficulty?: string; category?: string; search?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Concept>>('/concepts/', { params }),

  // Detail is looked up by slug (see /concepts/<slug>/ on the backend).
  detail: (slug: string) => apiClient.get<Concept>(`/concepts/${slug}/`),

  knowledgeGraph: () => apiClient.get<KnowledgeGraph>('/concepts/graph/'),
}
