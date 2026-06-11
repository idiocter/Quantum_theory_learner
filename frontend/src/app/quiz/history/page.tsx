'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import AuthGuard from '@/components/auth/AuthGuard'
import { quizzesApi } from '@/lib/api/quizzes'
import { relativeTime } from '@/lib/utils'

export default function QuizHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-attempts', 'all'],
    queryFn: () => quizzesApi.myAttempts().then((r) => r.data),
  })

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Quiz History</h1>
            <p className="text-sm text-slate-500 mt-1">All past attempts and scores.</p>
          </div>
          <Link href="/quiz" className="btn-ghost text-sm">← Quizzes</Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-quantum p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : !data?.results.length ? (
          <div className="text-center py-20">
            <div className="text-4xl text-slate-700 mb-3">⊞</div>
            <p className="text-slate-600 mb-4">No quiz attempts yet.</p>
            <Link href="/quiz" className="btn-quantum text-sm">Take your first quiz</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.results.map((a) => (
              <div key={a.id} className="card-quantum px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{a.quiz_title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {a.completed_at ? relativeTime(a.completed_at) : 'In progress'} ·{' '}
                    <span className={a.status === 'completed' ? 'text-wave-500' : 'text-photon-500'}>{a.status}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className={`text-xl font-mono font-bold ${(a.percentage ?? 0) >= 70 ? 'text-wave-400' : 'text-particle-400'}`}>
                    {a.percentage?.toFixed(0) ?? '-'}%
                  </div>
                  <div className="text-xs text-slate-600">{a.score}/{a.max_score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
