'use client'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/auth'
import { extractErrorMessage } from '@/lib/api/client'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, progress, isLoading, setUser, setProgress, setLoading, logout: clearAuth } = useAuthStore()
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const [userRes, progressRes] = await Promise.all([authApi.me(), authApi.myProgress()])
      setUser(userRes.data)
      setProgress(progressRes.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [setUser, setProgress, setLoading])

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const res = await authApi.google(credential)
      setUser(res.data.user)
      router.push('/dashboard')
    },
    [setUser, router]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // best-effort
    } finally {
      clearAuth()
      router.push('/login')
    }
  }, [clearAuth, router])

  // Listen for session expiry dispatched by axios interceptor
  useEffect(() => {
    const handler = () => {
      clearAuth()
      toast.error('Session expired. Please log in again.')
      router.push('/login')
    }
    window.addEventListener('qls:session-expired', handler)
    return () => window.removeEventListener('qls:session-expired', handler)
  }, [clearAuth, router])

  return { user, progress, isLoading, loginWithGoogle, logout, fetchUser, extractErrorMessage }
}
