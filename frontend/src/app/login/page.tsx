'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

export default function LoginPage() {
  const { loginWithGoogle, extractErrorMessage } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleCredential = async (credential: string) => {
    setLoading(true)
    try {
      await loginWithGoogle(credential)
      toast.success('Welcome to the quantum realm!')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl font-serif text-quantum-300 mb-4">Ψ</div>
          <h1 className="text-2xl font-bold text-white">Access the quantum realm</h1>
          <p className="text-sm text-slate-500 mt-2">Continue with Google to begin your learning journey</p>
        </div>

        {/* Card */}
        <div className="card-quantum p-8">
          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-slate-400 py-3">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Collapsing wavefunction...
              </span>
            ) : (
              <GoogleSignInButton onCredential={handleCredential} />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          We only use your Google account to sign you in — no passwords stored.
        </p>
      </div>
    </div>
  )
}
