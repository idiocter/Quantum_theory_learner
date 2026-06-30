'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { quizzesApi } from '@/lib/api/quizzes'
import { conceptsApi } from '@/lib/api/concepts'
import { useProgress } from '@/lib/hooks/useConcepts'
import ProgressRing from '@/components/concepts/ProgressRing'
import { formatXP, difficultyLabel, relativeTime } from '@/lib/utils'

const NAV_CARDS = [
  { href: '/concepts', icon: '◈', label: 'Concepts', desc: 'Explore the quantum knowledge base', color: 'card-quantum' },
  { href: '/knowledge-graph', icon: '⬡', label: 'Knowledge Graph', desc: 'See how concepts connect', color: 'card-plasma' },
  { href: '/simulations', icon: '∿', label: 'Simulations', desc: 'Run live quantum experiments', color: 'card-quantum' },
  { href: '/quiz', icon: '⊞', label: 'Quizzes', desc: 'Test your understanding', color: 'card-plasma' },
  { href: '/tutor', icon: 'Ψ', label: 'AI Tutor', desc: 'Ask Claude anything', color: 'card-quantum' },
]

function XPBar({ xp }: { xp: number }) {
  const level = Math.floor(xp / 1000) + 1
  const progress = (xp % 1000) / 10 // %
  return (
    <div className="card-quantum p-6">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">XP · Level {level}</span>
        <span className="text-sm font-mono text-quantum-400">{formatXP(xp)} XP</span>
      </div>
      <div className="w-full h-1.5 bg-void-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-quantum-600 to-quantum-400 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-slate-600 mt-2">{1000 - (xp % 1000)} XP to level {level + 1}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, progress, fetchUser } = useAuth()

  useEffect(() => { fetchUser() }, [fetchUser])

  const { data: attempts } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => quizzesApi.myAttempts().then((r) => r.data.results.slice(0, 5)),
  })

  const { data: concepts } = useQuery({
    queryKey: ['concepts-recent'],
    queryFn: () => conceptsApi.list({ page: 1 }).then((r) => r.data.results.slice(0, 4)),
  })

  const { data: topicProgress } = useProgress(!!user)
  const branchCompletion = Object.entries(topicProgress?.completion ?? {})
    .filter(([, c]) => c.total > 0)
    .sort((a, b) => b[1].percent - a[1].percent)
  const recentVisits = topicProgress?.visited?.slice(0, 6) ?? []

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Greeting */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full border border-quantum-500/30 bg-quantum-500/10 flex items-center justify-center text-xl font-mono text-quantum-300 animate-quantum-pulse">
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, <span className="text-quantum-400">{user?.username}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {progress?.streak_days
                ? `${progress.streak_days} day streak — keep the momentum!`
                : 'Start your learning streak today.'}
            </p>
          </div>
        </div>

        {/* XP + stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            {progress && <XPBar xp={progress.xp_points} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card-quantum p-4 text-center">
              <div className="text-2xl font-mono text-plasma-400">{progress?.quiz_attempts ?? 0}</div>
              <div className="text-xs text-slate-500 mt-1">Quizzes taken</div>
            </div>
            <div className="card-quantum p-4 text-center">
              <div className="text-2xl font-mono text-wave-400">{progress?.streak_days ?? 0}</div>
              <div className="text-xs text-slate-500 mt-1">Day streak</div>
            </div>
          </div>
        </div>

        {/* Navigation cards */}
        <section>
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Explore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_CARDS.map(({ href, icon, label, desc, color }) => (
              <Link key={href} href={href} className={`${color} p-6 group cursor-pointer`}>
                <div className="text-2xl font-mono text-slate-500 mb-3 group-hover:text-quantum-400 transition-colors">
                  {icon}
                </div>
                <div className="text-base font-semibold text-white mb-1">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Learning progress — per-branch completion rings */}
        {branchCompletion.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Progress by branch</h2>
              <Link href="/knowledge-graph" className="text-xs text-quantum-400 hover:text-quantum-300 transition-colors">
                Open the graph →
              </Link>
            </div>
            <div className="card-quantum p-6 flex flex-wrap gap-x-6 gap-y-5 justify-center sm:justify-start">
              {branchCompletion.map(([slug, c]) => (
                <ProgressRing
                  key={slug}
                  percent={c.percent}
                  color={c.color}
                  label={c.name}
                  sublabel={`${c.visited}/${c.total}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bookmarked topics */}
        {topicProgress && topicProgress.bookmarks.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">★ Bookmarks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topicProgress.bookmarks.map((b) => (
                <Link key={b.concept_slug} href={`/concepts/${b.concept_slug}`} className="card-quantum px-5 py-3 group flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-sm text-white group-hover:text-quantum-300 transition-colors block truncate">{b.concept_title}</span>
                    <span className="text-xs text-slate-600">{b.branch_name}</span>
                  </span>
                  <span className="text-amber-300 shrink-0">★</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent visits */}
        {recentVisits.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Recently visited</h2>
            <div className="space-y-2">
              {recentVisits.map((v) => (
                <Link key={v.concept_slug} href={`/concepts/${v.concept_slug}`} className="card-quantum px-5 py-3 group flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-sm text-white group-hover:text-quantum-300 transition-colors block truncate">{v.concept_title}</span>
                    <span className="text-xs text-slate-600">{v.branch_name} · {relativeTime(v.visited_at)}</span>
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded shrink-0 badge-${v.difficulty}`}>{difficultyLabel(v.difficulty)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent concepts */}
        {concepts && concepts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Recent Concepts</h2>
              <Link href="/concepts" className="text-xs text-quantum-400 hover:text-quantum-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {concepts.map((c) => (
                <Link key={c.id} href={`/concepts/${c.id}`} className="card-quantum p-5 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-quantum-300 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-md ml-3 shrink-0 badge-${c.difficulty}`}>
                      {difficultyLabel(c.difficulty)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent quiz attempts */}
        {attempts && attempts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Recent Quiz Attempts</h2>
              <Link href="/quiz" className="text-xs text-quantum-400 hover:text-quantum-300 transition-colors">
                Take a quiz →
              </Link>
            </div>
            <div className="space-y-2">
              {attempts.map((a) => (
                <div key={a.id} className="card-quantum px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{a.quiz_title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {a.completed_at ? relativeTime(a.completed_at) : 'In progress'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-mono font-bold ${a.percentage >= 70 ? 'text-wave-400' : 'text-particle-400'}`}>
                      {a.percentage?.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-600">{a.score}/{a.max_score} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AuthGuard>
  )
}
