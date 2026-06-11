'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/hooks/useAuth'

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: letters, numbers and underscores only'),
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  path: ['password_confirm'],
  message: 'Passwords do not match',
})

type FormData = z.infer<typeof schema>

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to quantum mechanics', color: 'border-wave-500/40' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Undergraduate physics background', color: 'border-photon-500/40' },
  { value: 'advanced', label: 'Advanced', desc: 'Graduate-level knowledge', color: 'border-particle-500/40' },
] as const

export default function RegisterPage() {
  const { register: registerUser, extractErrorMessage } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await registerUser(data)
      toast.success('Welcome to the quantum realm!')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-5xl font-serif text-quantum-300 mb-4">Ψ</div>
          <h1 className="text-2xl font-bold text-white">Initialize your quantum state</h1>
          <p className="text-sm text-slate-500 mt-2">Create an account to begin your journey</p>
        </div>

        {/* Difficulty selector */}
        <div className="mb-6">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Your level</p>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map(({ value, label, desc, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedDifficulty(value)}
                className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                  selectedDifficulty === value
                    ? `${color} bg-void-800`
                    : 'border-white/5 bg-void-900/50 hover:border-white/10'
                }`}
              >
                <div className="text-xs font-semibold text-white">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5 hidden sm:block">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-quantum p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {[
              { id: 'username', label: 'Username', type: 'text', placeholder: 'quantum_explorer', autocomplete: 'username' },
              { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' },
              { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
              { id: 'password_confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
            ].map(({ id, label, type, placeholder, autocomplete }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  autoComplete={autocomplete}
                  className="input-quantum"
                  placeholder={placeholder}
                  {...register(id as keyof FormData)}
                />
                {errors[id as keyof FormData] && (
                  <p className="text-xs text-particle-400 mt-1">
                    {errors[id as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-quantum w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating quantum state...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-quantum-400 hover:text-quantum-300 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
