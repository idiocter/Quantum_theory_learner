'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-quantum-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-quantum-500/40 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-quantum-500/60 animate-quantum-pulse" />
          </div>
          <p className="text-xs font-mono text-quantum-400 tracking-widest uppercase animate-pulse">
            Initializing quantum state...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
