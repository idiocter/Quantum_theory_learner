'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { quizzesApi } from '@/lib/api/quizzes'
import { difficultyLabel } from '@/lib/utils'
import type { Quiz } from '@/types'

const DIFFICULTIES = ['', 'beginner', 'intermediate', 'advanced'] as const

function QuizCard({ q }: { q: Quiz }) {
  return (
    <div className="card-quantum p-6 flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-white">{q.title}</h3>
          <span className={`badge-${q.difficulty} text-xs px-2 py-0.5 rounded shrink-0`}>
            {difficultyLabel(q.difficulty)}
          </span>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{q.description}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{q.question_count ?? '?'} questions</span>
        <span>{q.time_limit_minutes} min</span>
      </div>
      <Link href={`/quiz/${q.id}`} className="btn-quantum text-sm py-2 text-center">
        Start Quiz →
      </Link>
    </div>
  )
}

function QuizListUI() {
  const searchParams = useSearchParams()
  const conceptFilter = searchParams.get('concept')
  const [difficulty, setDifficulty] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes', difficulty, conceptFilter],
    queryFn: () =>
      quizzesApi.list({ difficulty: difficulty || undefined, concept: conceptFilter ?? undefined }).then((r) => r.data),
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Quizzes</h1>
          <p className="text-sm text-slate-500">Test your quantum mechanics knowledge.</p>
        </div>
        <Link href="/quiz/history" className="btn-ghost text-sm">
          My Attempts →
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
              difficulty === d
                ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
            }`}
          >
            {d ? difficultyLabel(d) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-quantum p-6 animate-pulse h-48">
              <div className="h-4 bg-void-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-void-700 rounded w-full mb-2" />
              <div className="h-3 bg-void-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (data?.results ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <div className="text-4xl mb-3">⊞</div>
          <p>No quizzes available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data!.results.map((q) => <QuizCard key={q.id} q={q} />)}
        </div>
      )}
    </div>
  )
}

export default function QuizPage() {
  return (
    <AuthGuard>
      <Suspense>
        <QuizListUI />
      </Suspense>
    </AuthGuard>
  )
}
