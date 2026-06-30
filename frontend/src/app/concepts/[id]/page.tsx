'use client'
import { use, useEffect } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useConcept, useProgress, useToggleBookmark } from '@/lib/hooks/useConcepts'
import { useConceptsStore } from '@/lib/store/concepts'
import { useAuth } from '@/lib/hooks/useAuth'
import { conceptsApi } from '@/lib/api/concepts'
import { difficultyLabel } from '@/lib/utils'
import { TexProse } from '@/components/ui/Tex'
import FormulaBlock from '@/components/concepts/FormulaBlock'
import ConnectionsPanel from '@/components/concepts/ConnectionsPanel'
import AnimationSlot from '@/components/concepts/AnimationSlot'

// Log a server-side visit only after the reader has dwelled this long.
const VISIT_DELAY_MS = 10_000

export default function ConceptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: concept, isLoading } = useConcept(id)
  const markVisited = useConceptsStore((s) => s.markVisited)
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: progress } = useProgress(!!user)
  const toggleBookmark = useToggleBookmark()

  const slug = concept?.slug
  const bookmarked = progress?.visited.some((v) => v.concept_slug === slug && v.bookmarked) ?? false

  // Record the visit once the topic resolves (drives the sidebar "visited" dots).
  useEffect(() => {
    if (slug) markVisited(slug)
  }, [slug, markVisited])

  // Persist the visit to the server after a genuine read delay (logged-in only).
  useEffect(() => {
    if (!user || !slug) return
    const t = setTimeout(() => {
      conceptsApi
        .logVisit(slug, VISIT_DELAY_MS / 1000)
        .then(() => qc.invalidateQueries({ queryKey: ['progress'] }))
        .catch(() => {})
    }, VISIT_DELAY_MS)
    return () => clearTimeout(t)
  }, [user, slug, qc])

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

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <button
              onClick={() => toggleBookmark.mutate(concept.slug)}
              disabled={toggleBookmark.isPending}
              aria-pressed={bookmarked}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this topic'}
              className={`text-sm px-3 py-2 rounded-lg border transition-all ${
                bookmarked
                  ? 'border-amber-400/50 text-amber-300 bg-amber-400/10'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
          )}
          <Link
            href={`/tutor?concept=${concept.id}&difficulty=${concept.difficulty}`}
            className="btn-plasma text-sm px-4 py-2"
          >
            Ask AI Tutor
          </Link>
        </div>
      </div>

      <div className="card-quantum p-6 mb-6">
        <p className="text-slate-300 leading-relaxed">{concept.description}</p>
      </div>

      {/* Interactive simulation for this topic (omitted for stub topics). */}
      <AnimationSlot simulationKey={concept.related_simulation} />

      {/* The explanatory chapter(s) for this concept, ordered beginner → advanced. */}
      {concept.contents && concept.contents.length > 0 ? (
        concept.contents.map((content) => (
          <div key={content.id} className="card-quantum p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Explanation
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded badge-${content.level}`}>
                {difficultyLabel(content.level)}
              </span>
            </div>

            <div className="space-y-4">
              {content.explanation.split('\n\n').map((para, i) => (
                <p key={i} className="text-slate-300 leading-relaxed">{para}</p>
              ))}
            </div>

            {content.math_derivation && (
              <div className="mt-5">
                <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                  Derivation
                </h3>
                {content.math_derivation.split('\n\n').map((para, i) => (
                  <p key={i} className="text-slate-400 leading-relaxed text-sm mb-2">{para}</p>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="card-quantum p-6 mb-6 text-sm text-slate-600">
          A detailed explanation for this concept is coming soon.
        </div>
      )}

      {/* Formulas: rendered with KaTeX, symbol legends, and expandable derivations. */}
      {concept.formulas && concept.formulas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
            Key formulas
          </h2>
          <div className="flex flex-col gap-4">
            {concept.formulas.map((f) => (
              <FormulaBlock key={f.id} formula={f} />
            ))}
          </div>
        </div>
      )}

      {/* Historical context. */}
      {concept.history && (
        <div className="card-quantum p-6 mb-6">
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">History</h2>
          <div className="space-y-3">
            {concept.history.split('\n\n').map((para, i) => (
              <TexProse key={i} content={para} className="prose-quantum text-slate-300 leading-relaxed" />
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites and the topics this one unlocks. */}
      <div className="mb-6">
        <ConnectionsPanel prerequisites={concept.prerequisites} unlocks={concept.unlocks} />
      </div>

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
