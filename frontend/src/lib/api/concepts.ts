import { apiClient } from './client'
import type {
  Branch,
  Concept,
  ConceptSearchResult,
  Formula,
  KnowledgeGraph,
  LessonUnlock,
  PaginatedResponse,
  ProgressResponse,
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

  // Site-wide formula index (paginated server-side; we pull a large page and
  // filter client-side). max_page_size on the backend is 100.
  formulas: () =>
    apiClient.get<PaginatedResponse<Formula>>('/concepts/formulas/', { params: { page_size: 100 } }),

  knowledgeGraph: () => apiClient.get<KnowledgeGraph>('/concepts/graph/'),

  // Server-side prerequisite enforcement: per-lesson unlock status for the
  // authenticated user, optionally scoped to a branch (auth required).
  unlocks: (category?: string) =>
    apiClient.get<LessonUnlock[]>('/concepts/unlocks/', {
      params: category ? { category } : undefined,
    }),

  // ── Per-user progress (auth required) ──
  getProgress: () => apiClient.get<ProgressResponse>('/concepts/progress/'),

  logVisit: (slug: string, timeSpentSeconds: number) =>
    apiClient.post('/concepts/progress/', { slug, time_spent_seconds: timeSpentSeconds }),

  toggleBookmark: (slug: string) =>
    apiClient.patch<{ slug: string; bookmarked: boolean }>(`/concepts/${slug}/bookmark/`),
}
