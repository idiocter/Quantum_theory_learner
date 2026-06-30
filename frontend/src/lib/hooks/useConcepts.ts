'use client'
import { useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'

// 5 minutes — matches the Redis `cache_page(300)` on the branch/graph endpoints
// so the client cache and the server cache expire on the same cadence.
const STALE_TIME = 5 * 60 * 1000

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => conceptsApi.branches().then((r) => r.data),
    staleTime: STALE_TIME,
  })
}

export function useConceptList(params?: {
  difficulty?: string
  category?: string
  search?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['concepts', params ?? {}],
    queryFn: () => conceptsApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
  })
}

// The full topic list (page_size 100 covers all ~65 topics) used by the sidebar
// and connections panel to group topics by branch and resolve slug → title.
export function useAllConcepts() {
  return useConceptList({ page_size: 100 })
}

export function useConcept(slug: string | undefined) {
  return useQuery({
    queryKey: ['concept', slug],
    queryFn: () => conceptsApi.detail(slug as string).then((r) => r.data),
    enabled: Boolean(slug),
    staleTime: STALE_TIME,
  })
}

export function useConceptSearch(q: string) {
  return useQuery({
    queryKey: ['concept-search', q],
    queryFn: () => conceptsApi.search(q).then((r) => r.data),
    enabled: q.trim().length > 0,
    staleTime: STALE_TIME,
  })
}

export function useFormulaIndex(q?: string) {
  return useQuery({
    queryKey: ['formulas', q ?? ''],
    queryFn: () => conceptsApi.formulas(q).then((r) => r.data),
    staleTime: STALE_TIME,
  })
}
