import { apiClient } from './client'
import type { GlossaryTerm } from '@/types'

export const glossaryApi = {
  // All glossary terms as a flat list (the backend returns them unpaginated).
  list: () => apiClient.get<GlossaryTerm[]>('/concepts/glossary/'),

  // A single term by slug.
  detail: (slug: string) => apiClient.get<GlossaryTerm>(`/concepts/glossary/${slug}/`),
}
