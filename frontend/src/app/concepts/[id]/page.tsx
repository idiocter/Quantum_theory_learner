'use client'
import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'
import { difficultyLabel } from '@/lib/utils'

export default function ConceptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: concept, isLoading } = useQuery({
    queryKey: ['concept', id],
    queryFn: () => conceptsApi.detail(id).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-void-800 rounded w-2/3" />
        <div className="h-4 bg-void-800 rounded w-1/3" />
        <div className="h-40 bg-void-800 rounded" />
      </div>
    )
  }

  if (!concept) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500">
        Concept not found.{' '}
        <Link href="/concepts" className="text-quantum-400 hover:underline">Back to concepts</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/concepts" className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6 inline-flex items-center gap-1">
        ← Back to concepts
      </Link>

      <div className="mb-6 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white">{concept.title}</h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded badge-${concept.difficulty}`}>
              {difficultyLabel(concept.difficulty)}
            </span>
            {concept.category && (
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: `${concept.category.color}22`, color: concept.category.color }}
              >
                {concept.category.name}
              </span>
            )}
            <span className="text-xs text-slate-600">{concept.estimated_minutes} min read</span>
            <span className="text-xs text-slate-600">{concept.view_count} views</span>
          </div>
        </div>

        <Link
          href={`/tutor?concept=${concept.id}`}
          className="btn-plasma text-sm px-4 py-2 shrink-0"
        >
          Ask AI Tutor
        </Link>
      </div>

      <div className="card-quantum p-6 mb-6">
        <p className="text-slate-300 leading-relaxed">{concept.description}</p>
      </div>

      {concept.prerequisites && concept.prerequisites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Prerequisites</h2>
          <div className="flex flex-wrap gap-2">
            {concept.prerequisites.map((prereq: string) => (
              <Link
                key={prereq}
                href={`/concepts/${prereq}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-quantum-500/20 text-quantum-400 hover:border-quantum-500/50 hover:text-quantum-300 transition-all"
              >
                → prerequisite
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-8 flex-wrap">
        <Link href="/knowledge-graph" className="btn-ghost text-sm">
          View Knowledge Graph
        </Link>
        <Link href={`/quiz?concept=${concept.id}`} className="btn-quantum text-sm">
          Take a Quiz
        </Link>
      </div>
    </div>
  )
}
