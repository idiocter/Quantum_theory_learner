'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserProgress } from '@/types'

interface AuthState {
  user: User | null
  progress: UserProgress | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProgress: (progress: UserProgress | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      progress: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProgress: (progress) => set({ progress }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, progress: null }),
    }),
    {
      name: 'qls-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
