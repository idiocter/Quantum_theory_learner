'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useFormulaIndex() {
  return useQuery({
    queryKey: ['formulas'],
    queryFn: () => conceptsApi.formulas().then((r) => r.data.results),
    staleTime: STALE_TIME,
  })
}

// Server-side prerequisite enforcement: authoritative per-lesson unlock status.
// `enabled` should be the logged-in flag (the endpoint requires auth); anonymous
// callers get no rows, and the UI falls back to treating lessons as accessible.
export function useUnlocks(category?: string, enabled = true) {
  return useQuery({
    queryKey: ['unlocks', category ?? 'all'],
    queryFn: () => conceptsApi.unlocks(category).then((r) => r.data),
    enabled,
    staleTime: 60 * 1000,
  })
}

// Per-user progress (visited topics, bookmarks, per-branch completion).
// `enabled` should be the logged-in flag so anonymous users don't 401-spam.
export function useProgress(enabled = true) {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => conceptsApi.getProgress().then((r) => r.data),
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useToggleBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => conceptsApi.toggleBookmark(slug).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress'] }),
  })
}
