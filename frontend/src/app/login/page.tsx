'use client'
import type { Metadata } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

const FEATURE_BULLETS = [
  { icon: '◈', label: 'Interactive simulations for every topic' },
  { icon: '⬡', label: 'Visual knowledge graph with prerequisites' },
  { icon: 'Ψ', label: 'AI tutor with LaTeX-rendered explanations' },
  { icon: '⊞', label: 'Adaptive quizzes and XP progression' },
]

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
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden md:flex flex-col justify-between p-12 border-r border-white/5">
        <Link href="/" aria-label="Back to home" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm w-fit">
          ← Back to home
        </Link>

        <div>
          <div className="text-7xl font-serif text-quantum-300 mb-6" aria-hidden>Ψ</div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Your quantum learning<br />journey starts here
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Everything you need to master quantum mechanics — from wave functions
            to quantum algorithms — in one adaptive platform.
          </p>

          <ul className="space-y-4" aria-label="Platform features">
            {FEATURE_BULLETS.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-slate-400">
                <span className="font-mono text-quantum-400 w-5 text-center shrink-0" aria-hidden>{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-700">
          QLS · Quantum Learning System
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile back link */}
          <Link href="/" className="md:hidden flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8 w-fit">
            ← Back to home
          </Link>

          <div className="text-center mb-10">
            <div className="text-5xl font-serif text-quantum-300 mb-4" aria-hidden>Ψ</div>
            <h1 className="text-2xl font-bold text-white">Access the quantum realm</h1>
            <p className="text-sm text-slate-500 mt-2">
              Continue with Google to begin your learning journey
            </p>
          </div>

          <div className="card-quantum p-8">
            <div className="flex flex-col items-center gap-4">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-slate-400 py-3" role="status" aria-live="polite">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                  Collapsing wavefunction…
                </span>
              ) : (
                <GoogleSignInButton onCredential={handleCredential} />
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                We only use your Google account to sign you in.<br />
                No passwords stored. No spam.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            By signing in you agree to learn quantum mechanics.
          </p>
        </div>
      </div>
    </div>
  )
}
