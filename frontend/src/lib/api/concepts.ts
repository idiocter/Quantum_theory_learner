import { apiClient } from './client'
import type {
  Branch,
  Concept,
  ConceptSearchResult,
  Formula,
  KnowledgeGraph,
  PaginatedResponse,
} from '@/types'

export const conceptsApi = {
  list: (params?: {
    difficulty?: string
    category?: string
    search?: string
    page?: number
    page_size?: number
  }) => apiClient.get<PaginatedResponse<Concept>>('/concepts/', { params }),

  // Detail is looked up by slug (see /concepts/<slug>/ on the backend).
  detail: (slug: string) => apiClient.get<Concept>(`/concepts/${slug}/`),

  // All 8 branches with their published-topic counts (flat list, not paginated).
  branches: () => apiClient.get<Branch[]>('/concepts/branches/'),

  // Ranked full-text search over topics (Postgres FTS).
  search: (q: string) =>
    apiClient.get<ConceptSearchResult[]>('/concepts/search/', { params: { q } }),

  // Site-wide formula index, optionally filtered by query.
  formulas: (q?: string) =>
    apiClient.get<Formula[]>('/concepts/formulas/', { params: q ? { q } : undefined }),

  knowledgeGraph: () => apiClient.get<KnowledgeGraph>('/concepts/graph/'),
}
