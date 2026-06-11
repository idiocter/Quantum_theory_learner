'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/hooks/useAuth'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, extractErrorMessage } = useAuth()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await login(data.username, data.password)
      toast.success('Welcome back!')
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
          <p className="text-sm text-slate-500 mt-2">Sign in to continue your learning journey</p>
        </div>

        {/* Card */}
        <div className="card-quantum p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="input-quantum"
                placeholder="your_username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-particle-400 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input-quantum"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-particle-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-quantum w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Collapsing wavefunction...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          New to QLS?{' '}
          <Link href="/register" className="text-quantum-400 hover:text-quantum-300 transition-colors">
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  )
}
