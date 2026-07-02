'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { glossaryApi } from '@/lib/api/glossary'
import type { GlossaryTerm } from '@/types'

// The glossary is a small, slow-changing controlled vocabulary — cache it hard.
const GLOSSARY_STALE_TIME = 30 * 60 * 1000

/**
 * Fetch the glossary once and expose it both as a list and as a slug→term map
 * for the prose linker (see `GlossaryText`).
 */
export function useGlossary() {
  const query = useQuery({
    queryKey: ['glossary'],
    queryFn: () => glossaryApi.list().then((r) => r.data),
    staleTime: GLOSSARY_STALE_TIME,
  })

  const map = useMemo(() => {
    const m: Record<string, GlossaryTerm> = {}
    for (const t of query.data ?? []) m[t.slug] = t
    return m
  }, [query.data])

  return { terms: query.data ?? [], map, isLoading: query.isLoading }
}
