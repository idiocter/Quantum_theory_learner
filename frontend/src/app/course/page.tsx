'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { useAllConcepts, useBranches, useUnlocks } from '@/lib/hooks/useConcepts'
import { useAuth } from '@/lib/hooks/useAuth'
import { difficultyLabel } from '@/lib/utils'
import type { Concept, LessonUnlock } from '@/types'

// The Quantum Computing track is namespaced with `qc-` category slugs.
const QC_PREFIX = 'qc-'

function LessonRow({
  lesson,
  unlock,
  gated,
}: {
  lesson: Concept
  unlock?: LessonUnlock
  gated: boolean
}) {
  const locked = gated && unlock ? !unlock.unlocked : false
  const visited = unlock?.visited ?? false
  const missing = unlock?.prerequisites.filter((p) => !p.visited) ?? []

  const status = locked ? (
    <span className="text-slate-600" title="Locked">🔒</span>
  ) : visited ? (
    <span className="text-quantum-400" title="Visited">✓</span>
  ) : (
    <span className="text-slate-700" title="Not started">○</span>
  )

  const inner = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-4 shrink-0 text-center text-xs">{status}</span>
      <span className="truncate text-sm">{lesson.title}</span>
      <span className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded badge-${lesson.difficulty}`}>
        {difficultyLabel(lesson.difficulty)}
      </span>
    </div>
  )

  if (locked) {
    return (
      <div
        className="px-3 py-2.5 rounded-lg border border-white/5 bg-void-950/40 text-slate-500 cursor-not-allowed"
        title={
          missing.length
            ? `Locked — first visit: ${missing.map((p) => p.title).join(', ')}`
            : 'Locked'
        }
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/concepts/${lesson.slug}`}
      className="block px-3 py-2.5 rounded-lg border border-white/5 hover:border-quantum-500/40 hover:bg-quantum-500/5 text-slate-300 transition-colors"
    >
      {inner}
    </Link>
  )
}

export default function CourseOverviewPage() {
  const { user } = useAuth()
  const { data: branches, isLoading: branchesLoading } = useBranches()
  const { data: topicsPage } = useAllConcepts()
  // Server-side unlock oracle (auth only). Anonymous users see no gating.
  const { data: unlocks } = useUnlocks(undefined, !!user)

  const unlockBySlug = useMemo(() => {
    const m: Record<string, LessonUnlock> = {}
    for (const u of unlocks ?? []) m[u.slug] = u
    return m
  }, [unlocks])

  const qcBranches = (branches ?? [])
    .filter((b) => b.slug.startsWith(QC_PREFIX))
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const lessonsFor = (branchSlug: string) =>
    (topicsPage?.results ?? [])
      .filter((t) => t.category?.slug === branchSlug)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  if (branchesLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-void-800 rounded w-1/2" />
        <div className="h-40 bg-void-800 rounded" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white">Quantum Computing</h1>
      <p className="mt-3 text-slate-400 leading-relaxed">
        A guided track from the mathematical prerequisites through the
        state-vector foundations of quantum computing. Lessons unlock as you work
        through their prerequisites.
      </p>
      {!user && (
        <p className="mt-3 text-xs text-slate-500">
          <Link href="/login" className="text-quantum-300 hover:underline">Sign in</Link>{' '}
          to track progress and unlock lessons as you go.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-8">
        {qcBranches.map((branch) => {
          const lessons = lessonsFor(branch.slug)
          return (
            <section key={branch.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: branch.color }} />
                <h2 className="text-lg font-semibold text-white">{branch.name}</h2>
                <span className="text-xs text-slate-600">{branch.topic_count} lessons</span>
              </div>
              {branch.description && (
                <p className="text-sm text-slate-500 mb-3">{branch.description}</p>
              )}
              <div className="flex flex-col gap-1.5">
                {lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    unlock={unlockBySlug[lesson.slug]}
                    // Gate only when we have an authoritative unlock report.
                    gated={!!user}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
