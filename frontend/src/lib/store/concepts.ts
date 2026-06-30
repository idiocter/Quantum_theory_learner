'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConceptsState {
  // Slugs of topics the user has opened, newest last. Persisted to localStorage.
  visitedTopics: string[]
  // Whether the branch sidebar is expanded (mobile drawer / desktop collapse).
  sidebarOpen: boolean
  markVisited: (slug: string) => void
  hasVisited: (slug: string) => boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useConceptsStore = create<ConceptsState>()(
  persist(
    (set, get) => ({
      visitedTopics: [],
      sidebarOpen: true,
      markVisited: (slug) =>
        set((state) => ({
          // De-dupe, then append so the most recently visited is last.
          visitedTopics: [...state.visitedTopics.filter((s) => s !== slug), slug],
        })),
      hasVisited: (slug) => get().visitedTopics.includes(slug),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'qls-concepts',
      // Only the visit history is worth persisting; sidebar state is ephemeral.
      partialize: (state) => ({ visitedTopics: state.visitedTopics }),
    }
  )
)
